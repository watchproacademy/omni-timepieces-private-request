-- New records only. Legacy ready invoices remain shared; their publication is never rewritten.
ALTER TABLE request_files ADD COLUMN IF NOT EXISTS customer_visible boolean NOT NULL DEFAULT true;
-- statement
ALTER TABLE request_files DROP CONSTRAINT IF EXISTS request_files_kind_check;
-- statement
ALTER TABLE request_files ADD CONSTRAINT request_files_kind_check CHECK(kind IN ('identity','address','business','invoice','quote'));
-- statement
CREATE TABLE IF NOT EXISTS commercial_documents (
 id text PRIMARY KEY, inquiry_id text NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
 file_id text UNIQUE NOT NULL REFERENCES request_files(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('quote','invoice')), content_hash text NOT NULL,
 state text NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','published','discarded')),
 version integer NOT NULL DEFAULT 0, extraction jsonb NOT NULL DEFAULT '{}', draft jsonb,
 summary jsonb, issued_at timestamptz, time_zone text, expires_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz,
 CHECK(state<>'published' OR (summary IS NOT NULL AND issued_at IS NOT NULL AND time_zone IS NOT NULL AND published_at IS NOT NULL)),
 CHECK(state<>'published' OR ((kind='quote' AND expires_at IS NOT NULL AND expires_at=issued_at+interval '48 hours') OR (kind='invoice' AND expires_at IS NULL)))
);
-- statement
CREATE INDEX IF NOT EXISTS commercial_documents_request ON commercial_documents(inquiry_id,created_at);
-- statement
CREATE TABLE IF NOT EXISTS commercial_document_actions (
 key text PRIMARY KEY, document_id text NOT NULL REFERENCES commercial_documents(id) ON DELETE CASCADE,
 input jsonb NOT NULL, result_version integer NOT NULL
);
-- statement
CREATE OR REPLACE FUNCTION commercial_reserve(p_id text,p_file text,p_kind text,p_path text,p_mime text,p_size integer,p_hash text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE prior commercial_documents%ROWTYPE;
BEGIN
 PERFORM 1 FROM inquiries WHERE id=p_id AND COALESCE(retention_until,created_at+interval '1 year')>now() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_UNAVAILABLE'; END IF;
 IF p_kind NOT IN ('quote','invoice') THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
 SELECT * INTO prior FROM commercial_documents WHERE id=p_file;
 IF FOUND THEN
  IF prior.inquiry_id<>p_id OR prior.kind<>p_kind OR prior.content_hash<>p_hash THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
  RETURN;
 END IF;
 IF (SELECT count(*) FROM request_files WHERE inquiry_id=p_id AND state<>'deleting')>=20 THEN RAISE EXCEPTION 'FILE_LIMIT'; END IF;
 UPDATE inquiries SET retention_until=GREATEST(COALESCE(retention_until,created_at+interval '1 year'),now()+interval '1 year') WHERE id=p_id;
 INSERT INTO request_files(id,inquiry_id,kind,pathname,mime,size,expires_at,customer_visible) VALUES(p_file,p_id,p_kind,p_path,p_mime,p_size,now()+interval '1 year',false);
 INSERT INTO commercial_documents(id,inquiry_id,file_id,kind,content_hash) VALUES(p_file,p_id,p_file,p_kind,p_hash);
END $$;
-- statement
CREATE OR REPLACE FUNCTION commercial_mutate(p_id text,p_document text,p_version integer,p_key text,p_action text,p_data jsonb,p_actor text)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE old commercial_documents%ROWTYPE; prior commercial_document_actions%ROWTYPE; mutation jsonb; new_version integer; issued timestamptz;
BEGIN
 PERFORM 1 FROM inquiries WHERE id=p_id AND COALESCE(retention_until,created_at+interval '1 year')>now() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_UNAVAILABLE'; END IF;
 SELECT * INTO old FROM commercial_documents WHERE id=p_document AND inquiry_id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_UNAVAILABLE'; END IF;
 mutation:=jsonb_build_object('requestId',p_id,'documentId',p_document,'version',p_version,'action',p_action,'data',p_data);
 SELECT * INTO prior FROM commercial_document_actions WHERE key=p_key;
 IF FOUND THEN
  IF prior.document_id<>p_document OR prior.input<>mutation THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
  RETURN prior.result_version;
 END IF;
 IF old.version<>p_version THEN RAISE EXCEPTION 'STALE_UPDATE'; END IF;
 IF old.state<>'draft' OR p_action NOT IN ('save','approve','discard') THEN RAISE EXCEPTION 'DOCUMENT_IMMUTABLE'; END IF;
 IF NOT EXISTS(SELECT 1 FROM request_files WHERE id=old.file_id AND state='ready' AND scan_status='clean' AND expires_at>now()) THEN RAISE EXCEPTION 'UPLOAD_PENDING'; END IF;
 new_version:=old.version+1;
 IF p_action='approve' THEN
  IF (p_data->>'currency' IN ('USD','EUR','GBP','CHF','CAD','AUD','JPY') AND jsonb_typeof(p_data->'lines')='array' AND jsonb_array_length(p_data->'lines') BETWEEN 1 AND 20 AND jsonb_typeof(p_data->'fees')='array' AND jsonb_array_length(p_data->'fees')<=20 AND p_data->>'total' ~ '^\d{1,12}(\.\d{1,2})?$') IS NOT TRUE THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_data->'lines') line WHERE NOT EXISTS(SELECT 1 FROM inquiries i,jsonb_array_elements(COALESCE(i.request_details,i.payload)->'watches') w WHERE i.id=p_id AND w->>'id'=line->>'watchId')) THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  IF (SELECT sum((line->>'unitPrice')::numeric*(line->>'quantity')::integer) FROM jsonb_array_elements(p_data->'lines') line)+COALESCE((SELECT sum((fee->>'amount')::numeric) FROM jsonb_array_elements(p_data->'fees') fee),0)<>(p_data->>'total')::numeric THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_data->'lines') line WHERE (line->>'quantity')::integer NOT BETWEEN 1 AND 100 OR (line->>'unitPrice')::numeric<0 OR COALESCE(line->>'description','')='') OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_data->'fees') fee WHERE (fee->>'amount')::numeric<0 OR COALESCE(fee->>'label','')='') THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  IF COALESCE(p_data->>'balance','')<>'' AND ((p_data->>'balance')::numeric<0 OR (p_data->>'balance')::numeric>(p_data->>'total')::numeric) THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  IF old.kind='quote' AND COALESCE(p_data->>'paymentDueDate','')<>'' THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  issued:=(p_data->>'issuedAt')::timestamptz;
  IF issued IS NULL OR NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=p_data->>'timeZone') THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  UPDATE commercial_documents SET state='published',version=new_version,summary=p_data,draft=NULL,issued_at=issued,time_zone=p_data->>'timeZone',expires_at=CASE WHEN kind='quote' THEN issued+interval '48 hours' END,published_at=now() WHERE id=p_document;
  UPDATE request_files SET customer_visible=true WHERE id=old.file_id;
  INSERT INTO delivery_jobs(id,inquiry_id,kind,event) VALUES(p_document||':published',p_id,'update',jsonb_build_object('title',CASE WHEN old.kind='quote' THEN 'Your quote is available' ELSE 'Your invoice is available' END,'message',CASE WHEN old.kind='quote' THEN 'A reviewed quote is available in your private dashboard. Check its exact expiry before proceeding.' ELSE 'A reviewed invoice is available in your private dashboard.' END));
 ELSE
  UPDATE commercial_documents SET version=new_version,draft=CASE WHEN p_action='save' THEN p_data ELSE draft END,state=CASE WHEN p_action='discard' THEN 'discarded' ELSE state END WHERE id=p_document;
 END IF;
 INSERT INTO commercial_document_actions(key,document_id,input,result_version) VALUES(p_key,p_document,mutation,new_version);
 INSERT INTO request_events(id,inquiry_id,actor,action,detail) VALUES(p_key,p_id,p_actor,'commercial_document',jsonb_build_object('documentId',p_document,'kind',old.kind,'action',p_action,'version',new_version));
 RETURN new_version;
END $$;

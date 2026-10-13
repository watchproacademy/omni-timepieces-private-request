-- Additive only: no assent or agreement is inferred from existing records.
CREATE TABLE IF NOT EXISTS negotiation_offers (
 id text PRIMARY KEY, inquiry_id text NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
 -- Retain agreement snapshots until request deletion even after original file retention ends.
 document_id text NOT NULL, source_document_version integer NOT NULL, source_content_hash text NOT NULL, parent_id text REFERENCES negotiation_offers(id) ON DELETE CASCADE,
 revision integer NOT NULL, version integer NOT NULL DEFAULT 0,
 kind text NOT NULL CHECK(kind IN ('quote','counter')),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','accepted','rejected','countered','superseded')),
 terms jsonb NOT NULL, source_summary jsonb NOT NULL, terms_hash text NOT NULL,
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 operator_assented_at timestamptz, customer_assented_at timestamptz, decided_at timestamptz,
 actor text NOT NULL, reason text NOT NULL DEFAULT '',
 CHECK((kind='quote' AND parent_id IS NULL AND operator_assented_at IS NOT NULL) OR (kind='counter' AND parent_id IS NOT NULL AND customer_assented_at IS NOT NULL)),
 CHECK(state<>'accepted' OR (operator_assented_at IS NOT NULL AND customer_assented_at IS NOT NULL AND decided_at IS NOT NULL)),
 UNIQUE(document_id,revision)
);
-- statement
CREATE INDEX IF NOT EXISTS negotiation_offers_request ON negotiation_offers(inquiry_id,created_at);
-- statement
CREATE TABLE IF NOT EXISTS negotiation_actions (
 key text PRIMARY KEY, inquiry_id text NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
 input jsonb NOT NULL, result_id text NOT NULL REFERENCES negotiation_offers(id) ON DELETE CASCADE
);
-- statement
CREATE TABLE IF NOT EXISTS negotiation_events (
 id text PRIMARY KEY, inquiry_id text NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
 offer_id text NOT NULL REFERENCES negotiation_offers(id) ON DELETE CASCADE, action text NOT NULL,
 actor text NOT NULL, identity text NOT NULL, reason text NOT NULL, revision integer NOT NULL,
 terms_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
-- statement
CREATE OR REPLACE FUNCTION negotiation_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.id,NEW.inquiry_id,NEW.document_id,NEW.source_document_version,NEW.source_content_hash,NEW.parent_id,NEW.revision,NEW.kind,NEW.terms,NEW.source_summary,NEW.terms_hash,NEW.expires_at,NEW.created_at,NEW.actor,NEW.reason) IS DISTINCT FROM (OLD.id,OLD.inquiry_id,OLD.document_id,OLD.source_document_version,OLD.source_content_hash,OLD.parent_id,OLD.revision,OLD.kind,OLD.terms,OLD.source_summary,OLD.terms_hash,OLD.expires_at,OLD.created_at,OLD.actor,OLD.reason) OR OLD.state<>'pending' OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'OFFER_IMMUTABLE'; END IF;
 RETURN NEW;
END $$;
-- statement
DROP TRIGGER IF EXISTS negotiation_immutable_guard ON negotiation_offers;
-- statement
CREATE TRIGGER negotiation_immutable_guard BEFORE UPDATE ON negotiation_offers FOR EACH ROW EXECUTE FUNCTION negotiation_immutable();
-- statement
-- Publication supersedes overlapping pending offers, never an already agreed transaction.
CREATE OR REPLACE FUNCTION negotiation_quote_publication() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE prior negotiation_offers%ROWTYPE;
BEGIN
 IF NEW.kind='quote' AND NEW.state='published' AND OLD.state='draft' THEN
  FOR prior IN SELECT o.* FROM negotiation_offers o WHERE o.inquiry_id=NEW.inquiry_id AND o.state='pending' AND EXISTS(SELECT 1 FROM jsonb_array_elements(o.terms->'lines') a,jsonb_array_elements(NEW.summary->'lines') b WHERE a->>'watchId'=b->>'watchId') FOR UPDATE LOOP
   UPDATE negotiation_offers SET state='superseded',version=version+1,decided_at=clock_timestamp() WHERE id=prior.id;
   INSERT INTO negotiation_events(id,inquiry_id,offer_id,action,actor,identity,reason,revision,terms_hash) VALUES(NEW.id||':supersedes:'||prior.id,NEW.inquiry_id,prior.id,'superseded','system:quote_publication','Private desk','A newer quote was published: '||NEW.id,prior.revision,prior.terms_hash);
  END LOOP;
 END IF;
 RETURN NEW;
END $$;
-- statement
DROP TRIGGER IF EXISTS negotiation_quote_publication_guard ON commercial_documents;
-- statement
CREATE TRIGGER negotiation_quote_publication_guard AFTER UPDATE ON commercial_documents FOR EACH ROW EXECUTE FUNCTION negotiation_quote_publication();
-- statement
CREATE OR REPLACE FUNCTION negotiation_mutate(p_id text,p_offer text,p_version integer,p_key text,p_action text,p_data jsonb,p_role text,p_actor text,p_identity text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE old negotiation_offers%ROWTYPE; doc commercial_documents%ROWTYPE; prior negotiation_actions%ROWTYPE;
 mutation jsonb; terms jsonb; line jsonb; price text; lines jsonb:='[]'; total numeric:=0; precision integer; i integer:=0;
 result_id text:=p_offer; at_time timestamptz; revision integer:=1; other negotiation_offers%ROWTYPE; event_title text;
BEGIN
 PERFORM 1 FROM inquiries WHERE id=p_id AND COALESCE(retention_until,created_at+interval '1 year')>clock_timestamp() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_UNAVAILABLE'; END IF;
 at_time:=clock_timestamp();
 IF p_role NOT IN ('owner','customer') OR p_action NOT IN ('publish','accept','reject','counter') OR COALESCE(p_data->>'confirmed','false')<>'true' THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
 mutation:=jsonb_build_object('requestId',p_id,'offerId',p_offer,'version',p_version,'action',p_action,'data',p_data,'role',p_role,'actor',p_actor,'identity',p_identity);
 SELECT * INTO prior FROM negotiation_actions WHERE key=p_key;
 IF FOUND THEN
  IF prior.inquiry_id<>p_id OR prior.input<>mutation THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
  RETURN prior.result_id;
 END IF;
 IF p_action='publish' THEN
  IF p_role<>'owner' THEN RAISE EXCEPTION 'ACCESS_DENIED'; END IF;
  IF p_version<>0 OR COALESCE(trim(p_data->>'deliveryTerms'),'')='' THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  SELECT * INTO doc FROM commercial_documents WHERE id=p_data->>'documentId' AND inquiry_id=p_id AND kind='quote' AND state='published' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_UNAVAILABLE'; END IF;
  IF doc.issued_at>at_time THEN RAISE EXCEPTION 'OFFER_NOT_STARTED'; END IF;
  IF doc.expires_at<=at_time THEN RAISE EXCEPTION 'OFFER_EXPIRED'; END IF;
  IF NOT EXISTS(SELECT 1 FROM request_files WHERE id=doc.file_id AND state='ready' AND customer_visible AND scan_status='clean' AND expires_at>at_time) THEN RAISE EXCEPTION 'UPLOAD_PENDING'; END IF;
  IF EXISTS(SELECT 1 FROM negotiation_offers WHERE document_id=doc.id) THEN RAISE EXCEPTION 'OFFER_ALREADY_OPENED'; END IF;
  IF EXISTS(SELECT 1 FROM commercial_documents d WHERE d.inquiry_id=p_id AND d.kind='quote' AND d.state='published' AND d.id<>doc.id AND d.published_at>=doc.published_at AND EXISTS(SELECT 1 FROM jsonb_array_elements(d.summary->'lines') a,jsonb_array_elements(doc.summary->'lines') b WHERE a->>'watchId'=b->>'watchId')) THEN RAISE EXCEPTION 'OFFER_SUPERSEDED'; END IF;
  IF EXISTS(SELECT 1 FROM negotiation_offers o WHERE o.inquiry_id=p_id AND o.state='accepted' AND EXISTS(SELECT 1 FROM jsonb_array_elements(o.terms->'lines') a,jsonb_array_elements(doc.summary->'lines') b WHERE a->>'watchId'=b->>'watchId')) THEN RAISE EXCEPTION 'AGREEMENT_EXISTS'; END IF;
  terms:=jsonb_build_object('currency',doc.summary->'currency','lines',doc.summary->'lines','fees',doc.summary->'fees','total',doc.summary->'total','paymentTerms',doc.summary->'paymentTerms','paymentDueDate',doc.summary->'paymentDueDate','deliveryTerms',trim(p_data->>'deliveryTerms'));
  INSERT INTO negotiation_offers(id,inquiry_id,document_id,source_document_version,source_content_hash,revision,kind,terms,source_summary,terms_hash,expires_at,operator_assented_at,actor,reason) VALUES(p_offer,p_id,doc.id,doc.version,doc.content_hash,1,'quote',terms,doc.summary,encode(sha256(convert_to(terms::text,'UTF8')),'hex'),doc.expires_at,at_time,p_actor,COALESCE(p_data->>'reason',''));
 ELSE
  SELECT * INTO old FROM negotiation_offers WHERE id=p_offer AND inquiry_id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_UNAVAILABLE'; END IF;
  IF old.version<>p_version THEN RAISE EXCEPTION 'STALE_UPDATE'; END IF;
  IF old.state<>'pending' THEN RAISE EXCEPTION 'OFFER_CLOSED'; END IF;
  IF old.expires_at<=at_time THEN RAISE EXCEPTION 'OFFER_EXPIRED'; END IF;
  IF NOT EXISTS(SELECT 1 FROM commercial_documents d JOIN request_files f ON f.id=d.file_id WHERE d.id=old.document_id AND d.inquiry_id=p_id AND d.state='published' AND d.version=old.source_document_version AND d.content_hash=old.source_content_hash AND f.state='ready' AND f.customer_visible AND f.scan_status='clean' AND f.expires_at>at_time) THEN RAISE EXCEPTION 'UPLOAD_PENDING'; END IF;
  IF (old.kind='quote' AND p_role<>'customer') OR (old.kind='counter' AND p_role<>'owner') THEN RAISE EXCEPTION 'ACCESS_DENIED'; END IF;
  terms:=old.terms;revision:=old.revision;
  IF p_action='counter' THEN
   IF p_role<>'customer' OR old.kind<>'quote' OR jsonb_typeof(p_data->'prices') IS DISTINCT FROM 'array' OR jsonb_array_length(p_data->'prices')<>jsonb_array_length(terms->'lines') THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
   precision:=CASE WHEN terms->>'currency'='JPY' THEN 0 ELSE 2 END;
   FOR line IN SELECT value FROM jsonb_array_elements(terms->'lines') LOOP
    price:=p_data->'prices'->>i;
    IF price IS NULL OR price !~ '^\d{1,12}(\.\d{1,2})?$' OR scale(price::numeric)>precision THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
    lines:=lines||jsonb_build_array(jsonb_set(line,'{unitPrice}',to_jsonb(price)));
    total:=total+price::numeric*(line->>'quantity')::integer;i:=i+1;
   END LOOP;
   IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(lines) WITH ORDINALITY n(value,idx) WHERE (n.value->>'unitPrice')::numeric<>(old.terms->'lines'->((n.idx-1)::integer)->>'unitPrice')::numeric) THEN RAISE EXCEPTION 'UNCHANGED_COUNTER'; END IF;
   total:=total+COALESCE((SELECT sum((f->>'amount')::numeric) FROM jsonb_array_elements(terms->'fees') f),0);
   IF total>(CASE WHEN precision=0 THEN 999999999999 ELSE 999999999999.99 END) THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
   terms:=jsonb_set(jsonb_set(terms,'{lines}',lines),'{total}',to_jsonb(CASE WHEN precision=0 THEN trunc(total)::text ELSE (total::numeric(30,2))::text END));
   revision:=old.revision+1;result_id:=p_key;
   UPDATE negotiation_offers SET state='countered',version=version+1,decided_at=at_time WHERE id=old.id;
   INSERT INTO negotiation_offers(id,inquiry_id,document_id,source_document_version,source_content_hash,parent_id,revision,kind,terms,source_summary,terms_hash,expires_at,customer_assented_at,actor,reason) VALUES(result_id,p_id,old.document_id,old.source_document_version,old.source_content_hash,old.id,revision,'counter',terms,old.source_summary,encode(sha256(convert_to(terms::text,'UTF8')),'hex'),old.expires_at,at_time,p_actor,COALESCE(p_data->>'reason',''));
  ELSIF p_action='accept' THEN
   UPDATE negotiation_offers SET state='accepted',version=version+1,decided_at=at_time,operator_assented_at=CASE WHEN p_role='owner' THEN at_time ELSE operator_assented_at END,customer_assented_at=CASE WHEN p_role='customer' THEN at_time ELSE customer_assented_at END WHERE id=old.id;
  ELSE
   IF COALESCE(trim(p_data->>'reason'),'')='' THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
   UPDATE negotiation_offers SET state='rejected',version=version+1,decided_at=at_time WHERE id=old.id;
  END IF;
 END IF;
 INSERT INTO negotiation_actions(key,inquiry_id,input,result_id) VALUES(p_key,p_id,mutation,result_id);
 INSERT INTO negotiation_events(id,inquiry_id,offer_id,action,actor,identity,reason,revision,terms_hash) VALUES(p_key,p_id,result_id,p_action,p_actor,p_identity,COALESCE(p_data->>'reason',''),revision,encode(sha256(convert_to(terms::text,'UTF8')),'hex'));
 INSERT INTO request_events(id,inquiry_id,actor,action,detail) VALUES(p_key,p_id,p_actor,'negotiation',jsonb_build_object('offerId',result_id,'action',p_action,'revision',revision,'termsHash',encode(sha256(convert_to(terms::text,'UTF8')),'hex')));
 event_title:=CASE p_action WHEN 'publish' THEN 'An offer is ready for your decision' WHEN 'counter' THEN 'A customer counter needs review' WHEN 'accept' THEN 'Offer accepted' ELSE 'An offer revision was declined' END;
 INSERT INTO delivery_jobs(id,inquiry_id,kind,event) VALUES(p_key||':negotiation',p_id,CASE WHEN p_role='owner' THEN 'update' ELSE 'operator_update' END,jsonb_build_object('title',event_title,'message','Review the exact terms, decision and history in the protected private dashboard.','section','negotiation'));
 IF p_action='accept' THEN
  INSERT INTO delivery_jobs(id,inquiry_id,kind,event) VALUES(p_key||':agreement-copy',p_id,CASE WHEN p_role='owner' THEN 'operator_update' ELSE 'update' END,jsonb_build_object('title',event_title,'message','Both parties assented to the same immutable offer revision. This records agreement, not payment or transaction clearance.','section','negotiation'));
 END IF;
 RETURN result_id;
END $$;

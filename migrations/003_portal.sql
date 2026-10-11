ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS retention_until timestamptz;
-- statement
ALTER TABLE inquiries ALTER COLUMN retention_until SET DEFAULT (now()+interval '1 year');
-- statement
UPDATE inquiries SET retention_until=created_at+interval '1 year' WHERE retention_until IS NULL;
-- statement
ALTER TABLE watch_progress DROP CONSTRAINT IF EXISTS watch_progress_stage_check;
-- statement
ALTER TABLE watch_progress ADD CONSTRAINT watch_progress_stage_check CHECK(stage IN ('received','sourcing','quoted','quote_sent','invoice_sent','paid','verification','ready_to_ship','shipped','delivered','waiting','cancelled'));
-- statement
ALTER TABLE watch_progress ADD COLUMN IF NOT EXISTS carrier text NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS tracking_number text NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS tracking_url text NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS paid_at timestamptz;
-- statement
CREATE TABLE IF NOT EXISTS request_reviews (
 inquiry_id text PRIMARY KEY REFERENCES inquiries(id) ON DELETE CASCADE,
 state text NOT NULL DEFAULT 'not_requested' CHECK(state IN ('not_requested','requested','submitted','in_review','changes_requested','approved','declined')),
 requirements jsonb NOT NULL DEFAULT '["identity"]', form jsonb NOT NULL DEFAULT '{}',
 version integer NOT NULL DEFAULT 0, decided_at timestamptz, decided_by text, updated_at timestamptz NOT NULL DEFAULT now()
);
-- statement
CREATE TABLE IF NOT EXISTS request_notes (
 id text PRIMARY KEY, inquiry_id text NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
 author text NOT NULL CHECK(author IN ('owner','customer')), visibility text NOT NULL CHECK(visibility IN ('customer','internal')),
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 3000), created_at timestamptz NOT NULL DEFAULT now()
);
-- statement
CREATE TABLE IF NOT EXISTS request_files (
 id text PRIMARY KEY, inquiry_id text NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('identity','address','business','invoice')),
 pathname text UNIQUE NOT NULL, mime text NOT NULL, size integer NOT NULL CHECK(size>0 AND size<=3145728),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','ready','deleting')),
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL
);
-- statement
CREATE TABLE IF NOT EXISTS request_events (
 id text PRIMARY KEY, inquiry_id text NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
 actor text NOT NULL, action text NOT NULL, detail jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
-- statement
ALTER TABLE delivery_jobs DROP CONSTRAINT IF EXISTS delivery_jobs_kind_check;
-- statement
ALTER TABLE delivery_jobs ADD CONSTRAINT delivery_jobs_kind_check CHECK(kind IN ('owner','receipt','update','operator_update'));
-- statement
ALTER TABLE delivery_jobs DROP CONSTRAINT IF EXISTS delivery_jobs_inquiry_id_kind_key;
-- statement
CREATE UNIQUE INDEX IF NOT EXISTS delivery_initial_unique ON delivery_jobs(inquiry_id,kind) WHERE kind IN ('owner','receipt');
-- statement
ALTER TABLE delivery_jobs ADD COLUMN IF NOT EXISTS event jsonb;
-- statement
CREATE INDEX IF NOT EXISTS request_files_expiry ON request_files(expires_at);
-- statement
CREATE OR REPLACE FUNCTION portal_stage(p_id text,p_watch text,p_stage text,p_version integer,p_carrier text,p_number text,p_url text,p_event text,p_actor text,p_message text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE current_row watch_progress%ROWTYPE; review_state text;
BEGIN
 PERFORM 1 FROM inquiries WHERE id=p_id AND COALESCE(retention_until,created_at+interval '1 year')>now() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_UNAVAILABLE'; END IF;
 IF NOT EXISTS(SELECT 1 FROM inquiries,jsonb_array_elements(payload->'watches') w WHERE id=p_id AND w->>'id'=p_watch) THEN RAISE EXCEPTION 'WATCH_UNAVAILABLE'; END IF;
 SELECT * INTO current_row FROM watch_progress WHERE inquiry_id=p_id AND watch_id=p_watch;
 IF COALESCE(current_row.version,0)<>p_version THEN RAISE EXCEPTION 'STALE_UPDATE'; END IF;
 SELECT state INTO review_state FROM request_reviews WHERE inquiry_id=p_id;
 IF p_stage IN ('ready_to_ship','shipped','delivered') AND review_state IS DISTINCT FROM 'approved' THEN RAISE EXCEPTION 'REVIEW_APPROVAL_REQUIRED'; END IF;
 IF p_stage IN ('ready_to_ship','shipped','delivered') AND current_row.paid_at IS NULL THEN RAISE EXCEPTION 'PAYMENT_REQUIRED'; END IF;
 IF p_stage IN ('shipped','delivered') AND (p_carrier='' OR p_number='') THEN RAISE EXCEPTION 'TRACKING_REQUIRED'; END IF;
 INSERT INTO watch_progress(inquiry_id,watch_id,stage,carrier,tracking_number,tracking_url,paid_at,version)
 VALUES(p_id,p_watch,p_stage,p_carrier,p_number,p_url,CASE WHEN p_stage='paid' THEN now() END,1)
 ON CONFLICT(inquiry_id,watch_id) DO UPDATE SET stage=p_stage,carrier=p_carrier,tracking_number=p_number,tracking_url=p_url,paid_at=CASE WHEN p_stage='paid' THEN COALESCE(watch_progress.paid_at,now()) WHEN p_stage IN ('received','sourcing','quoted','quote_sent','invoice_sent','waiting','cancelled') THEN NULL ELSE watch_progress.paid_at END,version=watch_progress.version+1;
 INSERT INTO request_events(id,inquiry_id,actor,action,detail) VALUES(p_event,p_id,p_actor,'stage',jsonb_build_object('watchId',p_watch,'from',COALESCE(current_row.stage,'received'),'to',p_stage));
 IF COALESCE(current_row.stage,'received')<>p_stage THEN
 INSERT INTO delivery_jobs(id,inquiry_id,kind,event) VALUES(p_event||':email',p_id,'update',jsonb_build_object('title','Your request has progressed','message',p_message));
 END IF;
END $$;
-- statement
CREATE OR REPLACE FUNCTION portal_review(p_id text,p_state text,p_version integer,p_requirements jsonb,p_form jsonb,p_event text,p_actor text,p_customer boolean)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE old request_reviews%ROWTYPE; required_kind text;
BEGIN
 PERFORM 1 FROM inquiries WHERE id=p_id AND COALESCE(retention_until,created_at+interval '1 year')>now() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_UNAVAILABLE'; END IF;
 SELECT * INTO old FROM request_reviews WHERE inquiry_id=p_id;
 IF COALESCE(old.version,0)<>p_version THEN RAISE EXCEPTION 'STALE_UPDATE'; END IF;
 IF p_customer THEN
  IF p_state<>'submitted' OR COALESCE(old.state,'not_requested') NOT IN ('requested','changes_requested') THEN RAISE EXCEPTION 'REVIEW_NOT_OPEN'; END IF;
  p_requirements:=old.requirements;
 END IF;
 IF p_state IN ('submitted','approved') AND EXISTS(SELECT 1 FROM request_files WHERE inquiry_id=p_id AND state='pending') THEN RAISE EXCEPTION 'UPLOAD_PENDING'; END IF;
 IF p_state IN ('submitted','approved') THEN
  FOR required_kind IN SELECT jsonb_array_elements_text(COALESCE(p_requirements,old.requirements)) LOOP
   IF NOT EXISTS(SELECT 1 FROM request_files WHERE inquiry_id=p_id AND kind=required_kind AND state='ready' AND expires_at>now()) THEN RAISE EXCEPTION 'DOCUMENTS_REQUIRED'; END IF;
  END LOOP;
 END IF;
 IF p_state='approved' AND COALESCE(old.state,'not_requested') NOT IN ('submitted','in_review') THEN RAISE EXCEPTION 'SUBMITTED_REVIEW_REQUIRED'; END IF;
 IF p_state='approved' AND NOT EXISTS(SELECT 1 FROM watch_progress WHERE inquiry_id=p_id AND paid_at IS NOT NULL) THEN RAISE EXCEPTION 'PAYMENT_REQUIRED'; END IF;
 INSERT INTO request_reviews(inquiry_id,state,version,requirements,form,decided_at,decided_by)
 VALUES(p_id,p_state,1,p_requirements,COALESCE(p_form,'{}'),CASE WHEN p_state IN ('approved','declined') THEN now() END,CASE WHEN p_state IN ('approved','declined') THEN p_actor END)
 ON CONFLICT(inquiry_id) DO UPDATE SET state=p_state,version=request_reviews.version+1,requirements=p_requirements,
 form=CASE WHEN p_customer THEN p_form ELSE request_reviews.form END,
 decided_at=CASE WHEN p_state IN ('approved','declined') THEN now() END,
 decided_by=CASE WHEN p_state IN ('approved','declined') THEN p_actor END,updated_at=now();
 INSERT INTO request_events(id,inquiry_id,actor,action,detail) VALUES(p_event,p_id,p_actor,'review',jsonb_build_object('from',COALESCE(old.state,'not_requested'),'to',p_state));
 IF COALESCE(old.state,'not_requested')<>p_state THEN
 INSERT INTO delivery_jobs(id,inquiry_id,kind,event) VALUES(p_event||':email',p_id,CASE WHEN p_customer THEN 'operator_update' ELSE 'update' END,jsonb_build_object('title','Transaction review update','message',CASE WHEN p_customer THEN 'A customer submitted their transaction review. Open the private dashboard to review it.' ELSE 'Your transaction review has an update. Open your private dashboard for the next step.' END));
 END IF;
END $$;
-- statement
CREATE OR REPLACE FUNCTION portal_reserve_file(p_id text,p_file text,p_kind text,p_path text,p_mime text,p_size integer,p_owner boolean)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM inquiries WHERE id=p_id AND COALESCE(retention_until,created_at+interval '1 year')>now() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_UNAVAILABLE'; END IF;
 IF (p_kind='invoice') IS DISTINCT FROM p_owner THEN RAISE EXCEPTION 'ACCESS_DENIED'; END IF;
 IF NOT p_owner AND NOT EXISTS(SELECT 1 FROM request_reviews WHERE inquiry_id=p_id AND state IN ('requested','changes_requested') AND requirements ? p_kind) THEN RAISE EXCEPTION 'REVIEW_NOT_OPEN'; END IF;
 IF (SELECT count(*) FROM request_files WHERE inquiry_id=p_id AND state<>'deleting')>=20 THEN RAISE EXCEPTION 'FILE_LIMIT'; END IF;
 UPDATE inquiries SET retention_until=GREATEST(COALESCE(retention_until,created_at+interval '1 year'),now()+interval '1 year') WHERE id=p_id;
 INSERT INTO request_files(id,inquiry_id,kind,pathname,mime,size,expires_at) VALUES(p_file,p_id,p_kind,p_path,p_mime,p_size,now()+interval '1 year');
END $$;
-- statement
CREATE OR REPLACE FUNCTION protect_retained_inquiry() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.retention_until>now() OR EXISTS(SELECT 1 FROM request_files WHERE inquiry_id=OLD.id AND state<>'deleting') THEN RETURN NULL; END IF;
 RETURN OLD;
END $$;
-- statement
DROP TRIGGER IF EXISTS protect_retained_inquiry_trigger ON inquiries;
-- statement
CREATE TRIGGER protect_retained_inquiry_trigger BEFORE DELETE ON inquiries FOR EACH ROW EXECUTE FUNCTION protect_retained_inquiry();
-- statement
CREATE OR REPLACE FUNCTION portal_connect(p_id text,p_watch text,p_order text,p_line text,p_snapshot jsonb,p_version integer,p_event text,p_actor text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE old_version integer;
BEGIN
 PERFORM 1 FROM inquiries WHERE id=p_id AND COALESCE(retention_until,created_at+interval '1 year')>now() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_UNAVAILABLE'; END IF;
 SELECT version INTO old_version FROM watch_progress WHERE inquiry_id=p_id AND watch_id=p_watch;
 IF COALESCE(old_version,0)<>p_version THEN RAISE EXCEPTION 'STALE_UPDATE'; END IF;
 INSERT INTO watch_progress(inquiry_id,watch_id,order_id,line_id,snapshot,checked_at,version) VALUES(p_id,p_watch,p_order,p_line,p_snapshot,now(),1)
 ON CONFLICT(inquiry_id,watch_id) DO UPDATE SET order_id=p_order,line_id=p_line,snapshot=p_snapshot,checked_at=now(),version=watch_progress.version+1;
 INSERT INTO request_events(id,inquiry_id,actor,action,detail) VALUES(p_event,p_id,p_actor,'shopify_connected',jsonb_build_object('watchId',p_watch,'orderId',p_order,'lineId',p_line));
END $$;

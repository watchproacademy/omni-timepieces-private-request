-- No backfill: existing payments, KYC decisions, agreements and files remain untouched.
CREATE TABLE IF NOT EXISTS transaction_workflows (
 offer_id text PRIMARY KEY REFERENCES negotiation_offers(id) ON DELETE CASCADE,
 inquiry_id text NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
 -- Preserve the confirmed invoice snapshot after the original file expires.
 invoice_id text NOT NULL, invoice_summary jsonb NOT NULL,
 payment_method text NOT NULL CHECK(length(payment_method) BETWEEN 1 AND 100),
 payment_instructions text NOT NULL CHECK(length(payment_instructions) BETWEEN 1 AND 3000),
 payment_state text NOT NULL DEFAULT 'awaiting' CHECK(payment_state IN ('awaiting','submitted','changes_requested','cleared')),
 payment_submitted_at timestamptz, cleared_amount text, cleared_currency text, funds_cleared_at timestamptz, funds_cleared_by text, clearance_note text NOT NULL DEFAULT '',
 kyc_state text NOT NULL DEFAULT 'pending' CHECK(kyc_state IN ('pending','more_information','approved','declined')),
 kyc_decided_at timestamptz, kyc_decided_by text,
 fulfilment_state text NOT NULL DEFAULT 'pending' CHECK(fulfilment_state IN ('pending','shipped','delivered','closed')),
 carrier text NOT NULL DEFAULT '', tracking_number text NOT NULL DEFAULT '', tracking_url text NOT NULL DEFAULT '',
 shipped_at timestamptz, delivered_at timestamptz, closed_at timestamptz,
 version integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(payment_state<>'cleared' OR (funds_cleared_at IS NOT NULL AND funds_cleared_by IS NOT NULL)),
 CHECK(kyc_state<>'approved' OR (kyc_decided_at IS NOT NULL AND kyc_decided_by IS NOT NULL)),
 CHECK(fulfilment_state='pending' OR (payment_state='cleared' AND kyc_state='approved' AND shipped_at IS NOT NULL AND carrier<>'' AND tracking_number<>''))
);
-- statement
CREATE INDEX IF NOT EXISTS transaction_workflows_request ON transaction_workflows(inquiry_id);
-- statement
CREATE TABLE IF NOT EXISTS transaction_actions (
 key text PRIMARY KEY, inquiry_id text NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
 offer_id text NOT NULL REFERENCES negotiation_offers(id) ON DELETE CASCADE, input jsonb NOT NULL, result_version integer NOT NULL
);
-- statement
CREATE TABLE IF NOT EXISTS transaction_files (
 file_id text PRIMARY KEY REFERENCES request_files(id) ON DELETE CASCADE,
 offer_id text NOT NULL REFERENCES transaction_workflows(offer_id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('payment_proof','shipment_proof','possession_photo')), content_hash text NOT NULL, upload_token text, upload_lease_until timestamptz
);
-- statement
CREATE TABLE IF NOT EXISTS request_closures (
 inquiry_id text PRIMARY KEY REFERENCES inquiries(id) ON DELETE CASCADE, closed_at timestamptz NOT NULL DEFAULT now(), actor text NOT NULL
);
-- statement
ALTER TABLE request_files DROP CONSTRAINT IF EXISTS request_files_kind_check;
-- statement
ALTER TABLE request_files ADD CONSTRAINT request_files_kind_check CHECK(kind IN ('identity','address','business','invoice','quote','payment_proof','shipment_proof','possession_photo'));
-- statement
ALTER TABLE watch_progress DROP CONSTRAINT IF EXISTS watch_progress_stage_check;
-- statement
ALTER TABLE watch_progress ADD CONSTRAINT watch_progress_stage_check CHECK(stage IN ('received','sourcing','quoted','quote_sent','invoice_sent','paid','verification','ready_to_ship','shipped','delivered','closed','waiting','cancelled'));
-- statement
CREATE OR REPLACE FUNCTION transaction_financial_terms(p_data jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
 SELECT jsonb_build_object('currency',p_data->>'currency','total',(p_data->>'total')::numeric,'paymentTerms',trim(COALESCE(p_data->>'paymentTerms','')),
 'lines',(SELECT jsonb_agg(jsonb_build_object('watchId',v->>'watchId','quantity',(v->>'quantity')::integer,'unitPrice',(v->>'unitPrice')::numeric) ORDER BY v->>'watchId',(v->>'quantity')::integer,(v->>'unitPrice')::numeric) FROM jsonb_array_elements(p_data->'lines') v),
 'fees',COALESCE((SELECT jsonb_agg(jsonb_build_object('label',v->>'label','amount',(v->>'amount')::numeric) ORDER BY v->>'label',(v->>'amount')::numeric) FROM jsonb_array_elements(p_data->'fees') v),'[]'::jsonb))
$$;
-- statement
-- Called within the same transaction as commercial_mutate when approving a new invoice.
CREATE OR REPLACE FUNCTION transaction_bind_invoice(p_id text,p_offer text,p_invoice text,p_method text,p_instructions text,p_key text,p_actor text)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE offer negotiation_offers%ROWTYPE; doc commercial_documents%ROWTYPE; prior transaction_actions%ROWTYPE; mutation jsonb;
BEGIN
 PERFORM 1 FROM inquiries WHERE id=p_id AND COALESCE(retention_until,created_at+interval '1 year')>now() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_UNAVAILABLE'; END IF;
 mutation:=jsonb_build_object('action','invoice','requestId',p_id,'offerId',p_offer,'invoiceId',p_invoice,'method',p_method,'instructions',p_instructions,'actor',p_actor);
 SELECT * INTO prior FROM transaction_actions WHERE key=p_key;
 IF FOUND THEN
  IF prior.inquiry_id<>p_id OR prior.input<>mutation THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
  RETURN prior.result_version;
 END IF;
 IF EXISTS(SELECT 1 FROM request_closures WHERE inquiry_id=p_id) THEN RAISE EXCEPTION 'REQUEST_CLOSED'; END IF;
 SELECT * INTO offer FROM negotiation_offers WHERE id=p_offer AND inquiry_id=p_id;
 IF NOT FOUND OR offer.state<>'accepted' OR offer.operator_assented_at IS NULL OR offer.customer_assented_at IS NULL THEN RAISE EXCEPTION 'AGREEMENT_REQUIRED'; END IF;
 SELECT * INTO doc FROM commercial_documents WHERE id=p_invoice AND inquiry_id=p_id;
 IF NOT FOUND OR doc.kind<>'invoice' OR doc.state<>'published' OR NOT EXISTS(SELECT 1 FROM request_files WHERE id=doc.file_id AND state='ready' AND scan_status='clean' AND expires_at>now()) THEN RAISE EXCEPTION 'INVOICE_REQUIRED'; END IF;
 IF transaction_financial_terms(doc.summary) IS DISTINCT FROM transaction_financial_terms(offer.terms) THEN RAISE EXCEPTION 'INVOICE_TERMS_MISMATCH'; END IF;
 IF trim(p_method)='' OR length(p_method)>100 OR trim(p_instructions)='' OR length(p_instructions)>3000 THEN RAISE EXCEPTION 'PAYMENT_INSTRUCTIONS_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM transaction_workflows WHERE offer_id=p_offer) THEN RAISE EXCEPTION 'INVOICE_ALREADY_LINKED'; END IF;
 INSERT INTO transaction_workflows(offer_id,inquiry_id,invoice_id,invoice_summary,payment_method,payment_instructions) VALUES(p_offer,p_id,p_invoice,doc.summary,p_method,p_instructions);
 INSERT INTO transaction_actions VALUES(p_key,p_id,p_offer,mutation,0);
 INSERT INTO request_events(id,inquiry_id,actor,action,detail) VALUES(p_key,p_id,p_actor,'transaction',jsonb_build_object('action','invoice','offerId',p_offer,'invoiceId',p_invoice));
 RETURN 0;
END $$;
-- statement
CREATE OR REPLACE FUNCTION transaction_publish_invoice(p_id text,p_offer text,p_invoice text,p_version integer,p_key text,p_summary jsonb,p_method text,p_instructions text,p_role text,p_actor text)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE result_version integer;
BEGIN
 IF p_role<>'owner' THEN RAISE EXCEPTION 'ACCESS_DENIED'; END IF;
 -- Both calls execute in one database transaction: a failed agreement check cannot publish an invoice or notification.
 PERFORM commercial_mutate(p_id,p_invoice,p_version,p_key,'approve',p_summary,p_actor);
 SELECT transaction_bind_invoice(p_id,p_offer,p_invoice,p_method,p_instructions,p_key||':transaction',p_actor) INTO result_version;
 RETURN result_version;
END $$;
-- statement
CREATE OR REPLACE FUNCTION transaction_reserve_file(p_id text,p_offer text,p_file text,p_kind text,p_path text,p_mime text,p_size integer,p_hash text,p_owner boolean,p_token text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE flow transaction_workflows%ROWTYPE; prior transaction_files%ROWTYPE; existing request_files%ROWTYPE;
BEGIN
 PERFORM 1 FROM inquiries WHERE id=p_id AND COALESCE(retention_until,created_at+interval '1 year')>clock_timestamp() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_UNAVAILABLE'; END IF;
 IF p_kind NOT IN ('payment_proof','shipment_proof','possession_photo') OR p_size NOT BETWEEN 1 AND 3145728 OR p_mime NOT IN ('application/pdf','image/png','image/jpeg') THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
 IF (p_kind='shipment_proof') IS DISTINCT FROM p_owner THEN RAISE EXCEPTION 'ACCESS_DENIED'; END IF;
 SELECT * INTO prior FROM transaction_files WHERE file_id=p_file;
 IF FOUND THEN
  SELECT * INTO existing FROM request_files WHERE id=p_file FOR UPDATE;
  IF existing.inquiry_id<>p_id OR prior.offer_id<>p_offer OR prior.kind<>p_kind OR prior.content_hash<>p_hash THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
  IF existing.state='ready' AND existing.scan_status='clean' AND existing.expires_at>clock_timestamp() THEN RETURN 'ready'; END IF;
  IF existing.state<>'pending' OR existing.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'UPLOAD_EXPIRED'; END IF;
  IF prior.upload_lease_until>clock_timestamp() THEN RAISE EXCEPTION 'UPLOAD_IN_PROGRESS'; END IF;
 END IF;
 SELECT * INTO flow FROM transaction_workflows WHERE offer_id=p_offer AND inquiry_id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'INVOICE_REQUIRED'; END IF;
 IF p_kind='shipment_proof' AND (flow.payment_state<>'cleared' OR flow.kyc_state<>'approved' OR flow.fulfilment_state<>'pending') THEN RAISE EXCEPTION 'SHIPPING_NOT_READY'; END IF;
 IF p_kind='payment_proof' AND (flow.payment_state='cleared' OR flow.fulfilment_state<>'pending') THEN RAISE EXCEPTION 'PAYMENT_NOT_OPEN'; END IF;
 IF p_kind='possession_photo' AND flow.fulfilment_state NOT IN ('delivered','closed') THEN RAISE EXCEPTION 'DELIVERY_REQUIRED'; END IF;
 p_token:=COALESCE(p_token,gen_random_uuid()::text);
 IF prior.file_id IS NOT NULL THEN
  UPDATE transaction_files SET upload_token=p_token,upload_lease_until=clock_timestamp()+interval '5 minutes' WHERE file_id=p_file;
  RETURN p_token;
 END IF;
 IF EXISTS(SELECT 1 FROM request_events WHERE id=p_file||':uploaded') THEN RAISE EXCEPTION 'UPLOAD_EXPIRED'; END IF;
 IF (SELECT count(*) FROM request_files WHERE inquiry_id=p_id AND state<>'deleting')>=20 THEN RAISE EXCEPTION 'FILE_LIMIT'; END IF;
 UPDATE inquiries SET retention_until=GREATEST(COALESCE(retention_until,created_at+interval '1 year'),clock_timestamp()+interval '1 year') WHERE id=p_id;
 INSERT INTO request_files(id,inquiry_id,kind,pathname,mime,size,expires_at,customer_visible) VALUES(p_file,p_id,p_kind,p_path,p_mime,p_size,clock_timestamp()+interval '1 year',p_kind<>'shipment_proof');
 INSERT INTO transaction_files(file_id,offer_id,kind,content_hash,upload_token,upload_lease_until) VALUES(p_file,p_offer,p_kind,p_hash,p_token,clock_timestamp()+interval '5 minutes');
 RETURN p_token;
END $$;
-- statement
CREATE OR REPLACE FUNCTION transaction_complete_file(p_id text,p_file text,p_token text,p_actor text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE file request_files%ROWTYPE; lease transaction_files%ROWTYPE;
BEGIN
 PERFORM 1 FROM inquiries WHERE id=p_id FOR UPDATE;
 SELECT * INTO file FROM request_files WHERE id=p_file AND inquiry_id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'UPLOAD_EXPIRED'; END IF;
 SELECT * INTO lease FROM transaction_files WHERE file_id=p_file;
 IF file.state='ready' AND file.scan_status='clean' AND file.expires_at>clock_timestamp() THEN RETURN; END IF;
 IF file.state<>'pending' OR file.expires_at<=clock_timestamp() OR lease.upload_token IS DISTINCT FROM p_token OR lease.upload_lease_until IS NULL OR lease.upload_lease_until<=clock_timestamp() THEN RAISE EXCEPTION 'UPLOAD_EXPIRED'; END IF;
 UPDATE request_files SET state='ready',scan_status='clean',scanned_at=clock_timestamp() WHERE id=p_file;
 UPDATE transaction_files SET upload_token=NULL,upload_lease_until=NULL WHERE file_id=p_file;
 INSERT INTO request_events(id,inquiry_id,actor,action,detail) VALUES(p_file||':uploaded',p_id,p_actor,'transaction_file',jsonb_build_object('offerId',lease.offer_id,'fileId',p_file,'kind',lease.kind)) ON CONFLICT(id) DO NOTHING;
END $$;
-- statement
-- Cleanup and reservation take the same request lock before inspecting file/lease state.
-- No lock is held while accessing Blob storage. Active leases are finite and never renewed by cleanup.
CREATE OR REPLACE FUNCTION transaction_claim_cleanup() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE parent record; marked integer; total integer:=0;
BEGIN
 FOR parent IN SELECT i.id FROM inquiries i WHERE EXISTS(SELECT 1 FROM request_files f WHERE f.inquiry_id=i.id AND (f.expires_at<=clock_timestamp() OR (f.state='pending' AND f.created_at<clock_timestamp()-interval '1 hour'))) ORDER BY i.id FOR UPDATE OF i SKIP LOCKED LOOP
  UPDATE request_files f SET state='deleting' WHERE f.inquiry_id=parent.id AND (f.expires_at<=clock_timestamp() OR (f.state='pending' AND f.created_at<clock_timestamp()-interval '1 hour')) AND NOT EXISTS(SELECT 1 FROM transaction_files tf WHERE tf.file_id=f.id AND tf.upload_lease_until>clock_timestamp());
  GET DIAGNOSTICS marked=ROW_COUNT;total:=total+marked;
 END LOOP;
 RETURN total;
END $$;
-- statement
CREATE OR REPLACE FUNCTION transaction_mutate(p_id text,p_offer text,p_version integer,p_key text,p_action text,p_data jsonb,p_role text,p_actor text)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE old transaction_workflows%ROWTYPE; prior transaction_actions%ROWTYPE; mutation jsonb; new_version integer; next_stage text; title text; target_kind text:='update'; item jsonb;
BEGIN
 PERFORM 1 FROM inquiries WHERE id=p_id AND COALESCE(retention_until,created_at+interval '1 year')>now() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_UNAVAILABLE'; END IF;
 IF p_role NOT IN ('owner','customer') OR p_action NOT IN ('payment_submit','funds_clear','payment_changes','kyc_approve','kyc_more_information','ship','deliver','close') OR COALESCE(p_data->>'confirmed','false')<>'true' THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
 IF (p_action='payment_submit') IS DISTINCT FROM (p_role='customer') THEN RAISE EXCEPTION 'ACCESS_DENIED'; END IF;
 mutation:=jsonb_build_object('requestId',p_id,'offerId',p_offer,'version',p_version,'action',p_action,'data',p_data,'role',p_role,'actor',p_actor);
 SELECT * INTO prior FROM transaction_actions WHERE key=p_key;
 IF FOUND THEN
  IF prior.inquiry_id<>p_id OR prior.input<>mutation THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
  RETURN prior.result_version;
 END IF;
 SELECT * INTO old FROM transaction_workflows WHERE offer_id=p_offer AND inquiry_id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'INVOICE_REQUIRED'; END IF;
 IF old.version<>p_version THEN RAISE EXCEPTION 'STALE_UPDATE'; END IF;
 IF old.fulfilment_state='closed' OR EXISTS(SELECT 1 FROM request_closures WHERE inquiry_id=p_id) THEN RAISE EXCEPTION 'REQUEST_CLOSED'; END IF;
 new_version:=old.version+1;
 IF p_action IN ('payment_submit','funds_clear','payment_changes','kyc_approve','kyc_more_information','ship') AND old.fulfilment_state<>'pending' THEN RAISE EXCEPTION 'SHIPMENT_IMMUTABLE'; END IF;
 IF p_action='payment_submit' THEN
  IF old.payment_state NOT IN ('awaiting','changes_requested') THEN RAISE EXCEPTION 'PAYMENT_NOT_OPEN'; END IF;
  IF NOT EXISTS(SELECT 1 FROM transaction_files tf JOIN request_files f ON f.id=tf.file_id WHERE tf.offer_id=p_offer AND tf.kind='payment_proof' AND f.state='ready' AND f.scan_status='clean' AND f.expires_at>now()) THEN RAISE EXCEPTION 'PAYMENT_PROOF_REQUIRED'; END IF;
  UPDATE transaction_workflows SET payment_state='submitted',payment_submitted_at=now() WHERE offer_id=p_offer;
  title:='Payment submitted for verification';target_kind:='operator_update';
 ELSIF p_action='funds_clear' THEN
  IF COALESCE(trim(p_data->>'note'),'')='' THEN RAISE EXCEPTION 'CLEARANCE_CONFIRMATION_REQUIRED'; END IF;
  IF old.payment_state='cleared' THEN RAISE EXCEPTION 'FUNDS_ALREADY_CLEARED'; END IF;
  IF COALESCE(p_data->>'amount','')!~'^\d{1,12}(\.\d{1,2})?$' OR p_data->>'currency' IS DISTINCT FROM old.invoice_summary->>'currency' THEN RAISE EXCEPTION 'FULL_FUNDS_REQUIRED'; END IF;
  IF (p_data->>'amount')::numeric<>(old.invoice_summary->>'total')::numeric THEN RAISE EXCEPTION 'FULL_FUNDS_REQUIRED'; END IF;
  UPDATE transaction_workflows SET payment_state='cleared',cleared_amount=p_data->>'amount',cleared_currency=p_data->>'currency',funds_cleared_at=now(),funds_cleared_by=p_actor,clearance_note=p_data->>'note' WHERE offer_id=p_offer;
  next_stage:='paid';title:='Funds cleared';
 ELSIF p_action='payment_changes' THEN
  IF old.payment_state='cleared' THEN RAISE EXCEPTION 'FUNDS_ALREADY_CLEARED'; END IF;
  IF COALESCE(trim(p_data->>'message'),'')='' THEN RAISE EXCEPTION 'MESSAGE_REQUIRED'; END IF;
  UPDATE transaction_workflows SET payment_state='changes_requested' WHERE offer_id=p_offer;
  title:='Payment information requested';
 ELSIF p_action IN ('kyc_approve','kyc_more_information') THEN
  IF old.payment_state<>'cleared' THEN RAISE EXCEPTION 'FUNDS_CLEARANCE_REQUIRED'; END IF;
  IF p_action='kyc_approve' THEN
   UPDATE transaction_workflows SET kyc_state='approved',kyc_decided_at=now(),kyc_decided_by=p_actor WHERE offer_id=p_offer;
   next_stage:='ready_to_ship';title:='Transaction review approved';
  ELSE
   IF COALESCE(trim(p_data->>'message'),'')='' THEN RAISE EXCEPTION 'MESSAGE_REQUIRED'; END IF;
   UPDATE transaction_workflows SET kyc_state='more_information',kyc_decided_at=NULL,kyc_decided_by=NULL WHERE offer_id=p_offer;
   next_stage:='verification';title:='More information requested';
  END IF;
 ELSIF p_action='ship' THEN
  IF old.payment_state<>'cleared' OR old.kyc_state<>'approved' THEN RAISE EXCEPTION 'SHIPPING_NOT_READY'; END IF;
  IF COALESCE(trim(p_data->>'carrier'),'')='' OR COALESCE(trim(p_data->>'trackingNumber'),'')='' THEN RAISE EXCEPTION 'TRACKING_REQUIRED'; END IF;
  IF NOT EXISTS(SELECT 1 FROM transaction_files tf JOIN request_files f ON f.id=tf.file_id WHERE tf.offer_id=p_offer AND tf.kind='shipment_proof' AND f.state='ready' AND f.scan_status='clean' AND f.expires_at>now()) THEN RAISE EXCEPTION 'SHIPMENT_PROOF_REQUIRED'; END IF;
  UPDATE transaction_workflows SET fulfilment_state='shipped',carrier=p_data->>'carrier',tracking_number=p_data->>'trackingNumber',tracking_url=COALESCE(p_data->>'trackingUrl',''),shipped_at=now() WHERE offer_id=p_offer;
  UPDATE request_files SET customer_visible=true WHERE id IN (SELECT file_id FROM transaction_files WHERE offer_id=p_offer AND kind='shipment_proof');
  next_stage:='shipped';title:='Your watch has been dispatched';
 ELSIF p_action='deliver' THEN
  IF old.fulfilment_state<>'shipped' THEN RAISE EXCEPTION 'SHIPMENT_REQUIRED'; END IF;
  UPDATE transaction_workflows SET fulfilment_state='delivered',delivered_at=now() WHERE offer_id=p_offer;
  next_stage:='delivered';title:='Your watch has arrived';
 ELSE
  IF old.fulfilment_state<>'delivered' THEN RAISE EXCEPTION 'DELIVERY_REQUIRED'; END IF;
  IF EXISTS(SELECT 1 FROM inquiries i CROSS JOIN LATERAL jsonb_array_elements(COALESCE(i.request_details,i.payload)->'watches') w LEFT JOIN watch_progress wp ON wp.inquiry_id=i.id AND wp.watch_id=w->>'id' WHERE i.id=p_id AND COALESCE(wp.stage,'received') NOT IN ('delivered','closed','cancelled')) THEN RAISE EXCEPTION 'REQUEST_NOT_DELIVERED'; END IF;
  INSERT INTO request_closures(inquiry_id,actor) VALUES(p_id,p_actor);
  UPDATE transaction_workflows SET fulfilment_state='closed',closed_at=now(),updated_at=now(),version=version+1 WHERE inquiry_id=p_id AND offer_id<>p_offer AND fulfilment_state='delivered';
  UPDATE transaction_workflows SET fulfilment_state='closed',closed_at=now() WHERE offer_id=p_offer;
  UPDATE watch_progress SET stage='closed',version=version+1 WHERE inquiry_id=p_id AND stage='delivered';
  title:='Your concierge request is complete';
 END IF;
 UPDATE transaction_workflows SET version=new_version,updated_at=now() WHERE offer_id=p_offer;
 IF p_action IN ('payment_changes','kyc_more_information') THEN
  INSERT INTO request_notes(id,inquiry_id,author,visibility,body) VALUES(p_key||':message',p_id,'owner','customer',p_data->>'message');
 END IF;
 IF next_stage IS NOT NULL THEN
  FOR item IN SELECT value FROM negotiation_offers o,jsonb_array_elements(o.terms->'lines') WHERE o.id=p_offer LOOP
   INSERT INTO watch_progress(inquiry_id,watch_id,stage,version,paid_at,carrier,tracking_number,tracking_url)
   SELECT p_id,item->>'watchId',next_stage,1,flow.funds_cleared_at,flow.carrier,flow.tracking_number,flow.tracking_url FROM transaction_workflows flow WHERE flow.offer_id=p_offer
   ON CONFLICT(inquiry_id,watch_id) DO UPDATE SET stage=next_stage,version=watch_progress.version+1,paid_at=EXCLUDED.paid_at,carrier=EXCLUDED.carrier,tracking_number=EXCLUDED.tracking_number,tracking_url=EXCLUDED.tracking_url;
  END LOOP;
 END IF;
 INSERT INTO transaction_actions VALUES(p_key,p_id,p_offer,mutation,new_version);
 INSERT INTO request_events(id,inquiry_id,actor,action,detail) VALUES(p_key,p_id,p_actor,'transaction',jsonb_build_object('action',p_action,'offerId',p_offer,'version',new_version));
 INSERT INTO delivery_jobs(id,inquiry_id,kind,event) VALUES(p_key||':transaction',p_id,target_kind,jsonb_build_object('title',title,'message',CASE WHEN p_action='payment_submit' THEN 'Payment evidence was submitted. Check actual funds in the account before recording cleared funds.' WHEN p_action='deliver' THEN 'Thank you for choosing Omni Timepieces. If you would like, share a photo of your watch in your private dashboard. This is optional.' ELSE 'Open your protected dashboard for the next step.' END,'section','transaction','transactionAction',p_action));
 RETURN new_version;
END $$;
-- statement
-- Legacy stage endpoints cannot bypass an enrolled transaction's manual gates.
CREATE OR REPLACE FUNCTION transaction_stage_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE flow transaction_workflows%ROWTYPE;
BEGIN
 IF NEW.stage='closed' AND NOT EXISTS(SELECT 1 FROM request_closures WHERE inquiry_id=NEW.inquiry_id) THEN RAISE EXCEPTION 'TRANSACTION_WORKFLOW_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM request_closures WHERE inquiry_id=NEW.inquiry_id) AND NEW.stage<>'closed' THEN RAISE EXCEPTION 'REQUEST_CLOSED'; END IF;
 FOR flow IN SELECT t.* FROM transaction_workflows t JOIN negotiation_offers o ON o.id=t.offer_id WHERE t.inquiry_id=NEW.inquiry_id AND EXISTS(SELECT 1 FROM jsonb_array_elements(o.terms->'lines') l WHERE l->>'watchId'=NEW.watch_id) LOOP
  IF NEW.stage='paid' AND flow.payment_state<>'cleared' THEN RAISE EXCEPTION 'FUNDS_CLEARANCE_REQUIRED'; END IF;
  IF NEW.paid_at IS NOT NULL AND flow.payment_state<>'cleared' THEN RAISE EXCEPTION 'FUNDS_CLEARANCE_REQUIRED'; END IF;
  IF NEW.stage IN ('ready_to_ship','shipped','delivered','closed') AND (flow.payment_state<>'cleared' OR flow.kyc_state<>'approved') THEN RAISE EXCEPTION 'SHIPPING_NOT_READY'; END IF;
  IF NEW.stage IN ('shipped','delivered','closed') AND flow.fulfilment_state NOT IN ('shipped','delivered','closed') THEN RAISE EXCEPTION 'SHIPMENT_PROOF_REQUIRED'; END IF;
  IF NEW.stage='delivered' AND flow.fulfilment_state NOT IN ('delivered','closed') THEN RAISE EXCEPTION 'DELIVERY_CONFIRMATION_REQUIRED'; END IF;
  IF NEW.stage='closed' AND flow.fulfilment_state<>'closed' THEN RAISE EXCEPTION 'DELIVERY_REQUIRED'; END IF;
  IF NEW.stage<>(CASE flow.fulfilment_state WHEN 'closed' THEN 'closed' WHEN 'delivered' THEN 'delivered' WHEN 'shipped' THEN 'shipped' ELSE CASE WHEN flow.kyc_state='approved' THEN 'ready_to_ship' WHEN flow.kyc_state='more_information' THEN 'verification' WHEN flow.payment_state='cleared' THEN 'paid' ELSE 'invoice_sent' END END) THEN RAISE EXCEPTION 'TRANSACTION_WORKFLOW_REQUIRED'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
-- statement
DROP TRIGGER IF EXISTS transaction_stage_guard_trigger ON watch_progress;
-- statement
CREATE TRIGGER transaction_stage_guard_trigger BEFORE INSERT OR UPDATE ON watch_progress FOR EACH ROW EXECUTE FUNCTION transaction_stage_guard();
-- statement
-- Preserve explicit legacy document requirements; new manual KYC does not invent an identity-upload requirement.
CREATE OR REPLACE FUNCTION require_scanned_shipping_files() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE requirements jsonb; enrolled boolean;
BEGIN
 IF NEW.stage IN ('ready_to_ship','shipped','delivered') THEN
  SELECT EXISTS(SELECT 1 FROM transaction_workflows t JOIN negotiation_offers o ON o.id=t.offer_id WHERE t.inquiry_id=NEW.inquiry_id AND EXISTS(SELECT 1 FROM jsonb_array_elements(o.terms->'lines') l WHERE l->>'watchId'=NEW.watch_id)) INTO enrolled;
  SELECT r.requirements INTO requirements FROM request_reviews r WHERE r.inquiry_id=NEW.inquiry_id AND (NOT enrolled OR r.state<>'not_requested');
  IF NOT review_files_scanned(NEW.inquiry_id,COALESCE(requirements,CASE WHEN enrolled THEN '[]'::jsonb ELSE '["identity"]'::jsonb END)) THEN RAISE EXCEPTION 'SCAN_REQUIRED'; END IF;
 END IF;
 RETURN NEW;
END $$;
-- statement
CREATE OR REPLACE FUNCTION transaction_closed_offer_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM request_closures WHERE inquiry_id=NEW.inquiry_id) THEN RAISE EXCEPTION 'REQUEST_CLOSED'; END IF;
 RETURN NEW;
END $$;
-- statement
DROP TRIGGER IF EXISTS transaction_closed_offer_guard_trigger ON negotiation_offers;
-- statement
CREATE TRIGGER transaction_closed_offer_guard_trigger BEFORE INSERT OR UPDATE ON negotiation_offers FOR EACH ROW EXECUTE FUNCTION transaction_closed_offer_guard();
-- statement
CREATE OR REPLACE FUNCTION transaction_closed_commercial_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.state='published' AND OLD.state='draft' AND EXISTS(SELECT 1 FROM request_closures WHERE inquiry_id=NEW.inquiry_id) THEN RAISE EXCEPTION 'REQUEST_CLOSED'; END IF;
 RETURN NEW;
END $$;
-- statement
DROP TRIGGER IF EXISTS transaction_closed_commercial_guard_trigger ON commercial_documents;
-- statement
CREATE TRIGGER transaction_closed_commercial_guard_trigger BEFORE UPDATE ON commercial_documents FOR EACH ROW EXECUTE FUNCTION transaction_closed_commercial_guard();

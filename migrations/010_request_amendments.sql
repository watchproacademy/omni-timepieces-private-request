-- Original payload and payload_hash remain the immutable submission evidence.
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS request_details jsonb,
 ADD COLUMN IF NOT EXISTS request_details_version integer NOT NULL DEFAULT 0 CHECK(request_details_version>=0);
-- statement
CREATE OR REPLACE FUNCTION portal_amend_request(p_id text,p_version integer,p_details jsonb,p_event text,p_actor text,p_operator text)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE old inquiries%ROWTYPE; prior request_events%ROWTYPE; effective jsonb; next_payload jsonb; changes jsonb:='[]'; old_watch jsonb; new_watch jsonb; field text; before_value jsonb; after_value jsonb;
BEGIN
 IF p_actor IS NULL OR p_actor NOT LIKE 'owner:%' THEN RAISE EXCEPTION 'ACCESS_DENIED'; END IF;
 SELECT * INTO old FROM inquiries WHERE id=p_id AND COALESCE(retention_until,created_at+interval '1 year')>now() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_UNAVAILABLE'; END IF;
 SELECT * INTO prior FROM request_events WHERE id=p_event;
 IF FOUND THEN
  IF prior.inquiry_id<>p_id OR prior.actor<>p_actor OR prior.action<>'request_edit' OR prior.detail->'submitted' IS DISTINCT FROM p_details THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
  RETURN (prior.detail->>'version')::integer;
 END IF;
 IF old.request_details_version<>p_version THEN RAISE EXCEPTION 'STALE_UPDATE'; END IF;
 effective:=COALESCE(old.request_details,old.payload);
 IF jsonb_typeof(p_details)<>'object' OR (p_details-ARRAY['watches','contact','conditionNotes','inspirationUrl'])<>'{}'::jsonb
 OR jsonb_typeof(p_details->'watches')<>'array' OR jsonb_typeof(p_details->'contact')<>'object'
 OR jsonb_typeof(p_details->'conditionNotes') IS DISTINCT FROM 'string' OR jsonb_typeof(p_details->'inspirationUrl') IS DISTINCT FROM 'string'
 OR NOT ((p_details->'contact') ?& ARRAY['fullName','phone','location','preferredContact'])
 OR ((p_details->'contact')-ARRAY['fullName','phone','location','preferredContact'])<>'{}'::jsonb THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
 -- Existing identifiers and order cannot be removed, added, or reassigned.
 IF (SELECT jsonb_agg(w->>'id' ORDER BY n) FROM jsonb_array_elements(effective->'watches') WITH ORDINALITY t(w,n)) IS DISTINCT FROM
 (SELECT jsonb_agg(w->>'id' ORDER BY n) FROM jsonb_array_elements(p_details->'watches') WITH ORDINALITY t(w,n)) THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
 FOR new_watch IN SELECT value FROM jsonb_array_elements(p_details->'watches') LOOP
  IF NOT (new_watch ?& ARRAY['id','brand','model','reference','year','dial','caseMaterial','bracelet','caseMaterialOther','braceletOther','occasion','condition','timeline','budget']) OR length(COALESCE(new_watch->>'brand',''))=0 OR length(COALESCE(new_watch->>'model',''))=0 OR (new_watch-ARRAY['id','brand','model','reference','year','dial','caseMaterial','bracelet','caseMaterialOther','braceletOther','occasion','condition','timeline','budget','budgetMin','budgetMax'])<>'{}'::jsonb THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  SELECT value INTO old_watch FROM jsonb_array_elements(effective->'watches') WHERE value->>'id'=new_watch->>'id';
  FOREACH field IN ARRAY ARRAY['brand','model','reference','year','dial','caseMaterial','bracelet','caseMaterialOther','braceletOther','occasion','condition','timeline','budget','budgetMin','budgetMax'] LOOP
   before_value:=COALESCE(old_watch->field,'null'::jsonb);after_value:=COALESCE(new_watch->field,'null'::jsonb);
   IF before_value IS DISTINCT FROM after_value THEN changes:=changes||jsonb_build_array(jsonb_build_object('path','watches.'||(new_watch->>'id')||'.'||field,'watchId',new_watch->>'id','before',before_value,'after',after_value)); END IF;
  END LOOP;
 END LOOP;
 FOR field IN SELECT jsonb_object_keys(p_details->'contact') LOOP
  before_value:=COALESCE(effective->'contact'->field,'null'::jsonb);after_value:=p_details->'contact'->field;
  IF before_value IS DISTINCT FROM after_value THEN changes:=changes||jsonb_build_array(jsonb_build_object('path','contact.'||field,'before',before_value,'after',after_value)); END IF;
 END LOOP;
 FOREACH field IN ARRAY ARRAY['conditionNotes','inspirationUrl'] LOOP
  before_value:=COALESCE(effective->field,'""'::jsonb);after_value:=p_details->field;
  IF before_value IS DISTINCT FROM after_value THEN changes:=changes||jsonb_build_array(jsonb_build_object('path',field,'before',before_value,'after',after_value)); END IF;
 END LOOP;
 next_payload:=effective||jsonb_build_object('watches',(SELECT jsonb_agg((original_watch-ARRAY['budgetMin','budgetMax'])||w ORDER BY n) FROM jsonb_array_elements(p_details->'watches') WITH ORDINALITY t(w,n) JOIN LATERAL (SELECT value AS original_watch FROM jsonb_array_elements(effective->'watches') WHERE value->>'id'=w->>'id') original ON true),'contact',(effective->'contact')||(p_details->'contact'),'conditionNotes',p_details->'conditionNotes','inspirationUrl',p_details->'inspirationUrl');
 IF changes='[]'::jsonb THEN RETURN old.request_details_version; END IF;
 UPDATE inquiries SET request_details=next_payload,request_details_version=old.request_details_version+1 WHERE id=p_id;
 INSERT INTO request_events(id,inquiry_id,actor,action,detail) VALUES(p_event,p_id,p_actor,'request_edit',jsonb_build_object('operator',p_operator,'changes',changes,'submitted',p_details,'version',old.request_details_version+1));
 -- An internal amendment never queues a customer email or modifies workflow evidence.
 RETURN old.request_details_version+1;
END $$;
-- statement
CREATE OR REPLACE FUNCTION portal_note(p_id text,p_key text,p_author text,p_visibility text,p_body text,p_kind text,p_event jsonb)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE prior request_notes%ROWTYPE;
BEGIN
 PERFORM 1 FROM inquiries WHERE id=p_id AND COALESCE(retention_until,created_at+interval '1 year')>now() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_UNAVAILABLE'; END IF;
 IF p_author NOT IN ('owner','customer') OR p_visibility NOT IN ('customer','internal') OR (p_author='customer' AND p_visibility='internal') THEN RAISE EXCEPTION 'ACCESS_DENIED'; END IF;
 SELECT * INTO prior FROM request_notes WHERE id=p_key;
 IF FOUND THEN
  IF prior.inquiry_id<>p_id OR prior.author<>p_author OR prior.visibility<>p_visibility OR prior.body<>p_body THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
  RETURN;
 END IF;
 INSERT INTO request_notes(id,inquiry_id,author,visibility,body) VALUES(p_key,p_id,p_author,p_visibility,p_body);
 IF p_visibility='customer' THEN INSERT INTO delivery_jobs(id,inquiry_id,kind,event) VALUES(p_key||':email',p_id,p_kind,p_event); END IF;
END $$;

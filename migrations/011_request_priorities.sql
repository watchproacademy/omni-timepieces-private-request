CREATE TABLE IF NOT EXISTS request_priorities (
 inquiry_id text PRIMARY KEY REFERENCES inquiries(id) ON DELETE CASCADE,
 level text CHECK(level IN ('focus','defer')), reason text NOT NULL DEFAULT '' CHECK(length(reason)<=300),
 version integer NOT NULL CHECK(version>0), updated_at timestamptz NOT NULL DEFAULT now()
);
-- statement
CREATE OR REPLACE FUNCTION portal_set_priority(p_id text,p_version integer,p_level text,p_reason text,p_key text,p_actor text,p_operator text)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE old request_priorities%ROWTYPE; prior request_events%ROWTYPE; submitted jsonb; next_version integer;
BEGIN
 IF p_actor IS NULL OR p_actor NOT LIKE 'owner:%' THEN RAISE EXCEPTION 'ACCESS_DENIED'; END IF;
 IF p_version IS NULL OR p_version<0 OR p_level IS NOT NULL AND p_level NOT IN ('focus','defer') OR p_reason IS NULL OR length(p_reason)>300 OR (p_level IS NOT NULL AND length(trim(p_reason))=0) OR (p_level IS NULL AND p_reason<>'') THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
 PERFORM 1 FROM inquiries WHERE id=p_id AND COALESCE(retention_until,created_at+interval '1 year')>now() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_UNAVAILABLE'; END IF;
 submitted:=jsonb_build_object('level',p_level,'reason',p_reason);
 SELECT * INTO prior FROM request_events WHERE id=p_key;
 IF FOUND THEN
  IF prior.inquiry_id<>p_id OR prior.actor<>p_actor OR prior.action<>'priority' OR prior.detail->'submitted' IS DISTINCT FROM submitted THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
  RETURN (prior.detail->>'version')::integer;
 END IF;
 SELECT * INTO old FROM request_priorities WHERE inquiry_id=p_id;
 IF COALESCE(old.version,0)<>p_version THEN RAISE EXCEPTION 'STALE_UPDATE'; END IF;
 IF old.level IS NOT DISTINCT FROM p_level AND COALESCE(old.reason,'')=p_reason THEN RETURN COALESCE(old.version,0); END IF;
 next_version:=COALESCE(old.version,0)+1;
 INSERT INTO request_priorities(inquiry_id,level,reason,version) VALUES(p_id,p_level,p_reason,next_version)
 ON CONFLICT(inquiry_id) DO UPDATE SET level=p_level,reason=p_reason,version=next_version,updated_at=now();
 INSERT INTO request_events(id,inquiry_id,actor,action,detail) VALUES(p_key,p_id,p_actor,'priority',jsonb_build_object('operator',p_operator,'from',old.level,'to',p_level,'reason',p_reason,'submitted',submitted,'version',next_version));
 RETURN next_version;
END $$;

-- statement
CREATE INDEX IF NOT EXISTS request_timeline_history ON request_events(inquiry_id,created_at DESC,id DESC) WHERE action='request_edit';

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
 -- Grandfather missing legacy phones; once supplied, a phone cannot be cleared.
 IF length(trim(COALESCE(effective->'contact'->>'phone','')))>0 AND length(trim(COALESCE(p_details->'contact'->>'phone','')))=0 THEN RAISE EXCEPTION 'PHONE_REQUIRED'; END IF;
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

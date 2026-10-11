-- A blocked legacy file never satisfies a requirement, but a clean replacement can.
CREATE OR REPLACE FUNCTION review_files_scanned(p_id text,p_requirements jsonb) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT NOT EXISTS(SELECT 1 FROM request_files WHERE inquiry_id=p_id AND kind<>'invoice'
  AND state='ready' AND expires_at>now() AND scan_status='unscanned')
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(p_requirements) required(kind)
  WHERE NOT EXISTS(SELECT 1 FROM request_files f WHERE f.inquiry_id=p_id AND f.kind=required.kind
   AND f.state='ready' AND f.expires_at>now() AND f.scan_status='clean'));
$$;
-- statement
CREATE OR REPLACE FUNCTION require_scanned_review_files() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.state IN ('submitted','approved') AND NOT review_files_scanned(NEW.inquiry_id,NEW.requirements)
 THEN RAISE EXCEPTION 'SCAN_REQUIRED'; END IF;
 RETURN NEW;
END $$;
-- statement
CREATE OR REPLACE FUNCTION require_scanned_shipping_files() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE requirements jsonb;
BEGIN
 IF NEW.stage IN ('ready_to_ship','shipped','delivered') THEN
  SELECT r.requirements INTO requirements FROM request_reviews r WHERE r.inquiry_id=NEW.inquiry_id;
  IF NOT review_files_scanned(NEW.inquiry_id,COALESCE(requirements,'["identity"]'::jsonb))
  THEN RAISE EXCEPTION 'SCAN_REQUIRED'; END IF;
 END IF;
 RETURN NEW;
END $$;

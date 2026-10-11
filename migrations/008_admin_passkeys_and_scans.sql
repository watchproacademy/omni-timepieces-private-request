ALTER TABLE tracking_access ADD COLUMN IF NOT EXISTS mfa_verified boolean NOT NULL DEFAULT false;
-- statement
CREATE TABLE IF NOT EXISTS admin_passkeys (
 id text PRIMARY KEY, owner_email text NOT NULL, rp_id text NOT NULL,
 public_key text NOT NULL, counter bigint NOT NULL DEFAULT 0,
 transports jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now()
);
-- statement
CREATE TABLE IF NOT EXISTS admin_enrollment (
 owner_email text PRIMARY KEY, code_hash text NOT NULL, expires_at timestamptz NOT NULL
);
-- statement
CREATE TABLE IF NOT EXISTS admin_challenges (
 session_hash text PRIMARY KEY REFERENCES tracking_access(token_hash) ON DELETE CASCADE,
 challenge text NOT NULL, kind text NOT NULL CHECK(kind IN ('register','authenticate')),
 owner_email text NOT NULL, rp_id text NOT NULL, bootstrap_hash text,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes'
);
-- statement
CREATE TABLE IF NOT EXISTS admin_security_events (
 id bigserial PRIMARY KEY, owner_email text NOT NULL, action text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
-- statement
ALTER TABLE request_files ADD COLUMN IF NOT EXISTS scan_status text NOT NULL DEFAULT 'unscanned'
 CHECK(scan_status IN ('unscanned','clean','blocked'));
-- statement
ALTER TABLE request_files ADD COLUMN IF NOT EXISTS scanned_at timestamptz;
-- statement
CREATE OR REPLACE FUNCTION require_scanned_review_files() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.state IN ('submitted','approved') AND EXISTS(
 SELECT 1 FROM request_files WHERE inquiry_id=NEW.inquiry_id AND kind<>'invoice'
 AND state='ready' AND expires_at>now() AND scan_status<>'clean') THEN
 RAISE EXCEPTION 'SCAN_REQUIRED'; END IF;
 RETURN NEW;
END $$;
-- statement
CREATE OR REPLACE TRIGGER require_scanned_review BEFORE INSERT OR UPDATE ON request_reviews
 FOR EACH ROW EXECUTE FUNCTION require_scanned_review_files();
-- statement
CREATE OR REPLACE FUNCTION require_scanned_shipping_files() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.stage IN ('ready_to_ship','shipped','delivered') AND EXISTS(
 SELECT 1 FROM request_files WHERE inquiry_id=NEW.inquiry_id AND kind<>'invoice'
 AND state='ready' AND expires_at>now() AND scan_status<>'clean') THEN
 RAISE EXCEPTION 'SCAN_REQUIRED'; END IF;
 RETURN NEW;
END $$;
-- statement
CREATE OR REPLACE TRIGGER require_scanned_shipping BEFORE INSERT OR UPDATE ON watch_progress
 FOR EACH ROW EXECUTE FUNCTION require_scanned_shipping_files();
-- statement
ALTER TABLE tracking_access ADD COLUMN IF NOT EXISTS owner_email text;
-- statement
CREATE OR REPLACE FUNCTION complete_admin_passkey(p_session text,p_owner text,p_rp text,p_id text,p_key text,p_counter bigint,p_previous bigint,p_transports jsonb,p_bootstrap text,p_new_session text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE access tracking_access%ROWTYPE;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('admin:'||p_owner,0));
 SELECT * INTO access FROM tracking_access WHERE token_hash=p_session AND role='owner' AND session AND expires_at>now() AND owner_email=p_owner FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ACCESS_DENIED'; END IF;
 IF p_key IS NOT NULL THEN
  IF NOT access.mfa_verified THEN
   IF EXISTS(SELECT 1 FROM admin_passkeys WHERE owner_email=p_owner AND rp_id=p_rp) THEN RAISE EXCEPTION 'ACCESS_DENIED'; END IF;
   DELETE FROM admin_enrollment WHERE owner_email=p_owner AND code_hash=p_bootstrap AND expires_at>now();
   IF NOT FOUND THEN RAISE EXCEPTION 'ACCESS_DENIED'; END IF;
  END IF;
  INSERT INTO admin_passkeys(id,owner_email,rp_id,public_key,counter,transports) VALUES(p_id,p_owner,p_rp,p_key,p_counter,p_transports);
 ELSE
  UPDATE admin_passkeys SET counter=p_counter WHERE id=p_id AND owner_email=p_owner AND rp_id=p_rp AND counter=p_previous;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACCESS_DENIED'; END IF;
 END IF;
 INSERT INTO tracking_access(token_hash,role,inquiry_id,expires_at,session,mfa_verified,owner_email) VALUES(p_new_session,'owner',NULL,access.expires_at,true,true,p_owner);
 DELETE FROM tracking_access WHERE token_hash=p_session;
 INSERT INTO admin_security_events(owner_email,action) VALUES(p_owner,CASE WHEN p_key IS NULL THEN 'passkey_verified' ELSE 'passkey_registered' END);
END $$;

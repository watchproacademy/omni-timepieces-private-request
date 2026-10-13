-- Anonymous ceremonies never expose or depend on the registered credential list.
CREATE TABLE IF NOT EXISTS admin_login_challenges (
 browser_hash text PRIMARY KEY, challenge text NOT NULL,
 owner_email text NOT NULL, rp_id text NOT NULL, origin text NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes'
);
-- statement
CREATE INDEX IF NOT EXISTS admin_login_challenges_expiry ON admin_login_challenges(expires_at);
-- statement
CREATE OR REPLACE FUNCTION complete_admin_passkey_login(p_owner text,p_rp text,p_id text,p_key text,p_previous bigint,p_counter bigint,p_session text,p_old_session text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('admin:'||p_owner,0));
 -- Recheck the exact key after signature verification, including concurrent revocation.
 UPDATE admin_passkeys SET counter=p_counter WHERE id=p_id AND owner_email=p_owner
  AND rp_id=p_rp AND public_key=p_key AND counter=p_previous;
 IF NOT FOUND THEN RAISE EXCEPTION 'ACCESS_DENIED'; END IF;
 INSERT INTO tracking_access(token_hash,role,inquiry_id,expires_at,session,mfa_verified,owner_email)
  VALUES(p_session,'owner',NULL,now()+interval '1 hour',true,true,p_owner);
 DELETE FROM tracking_access WHERE token_hash=p_old_session AND role='owner' AND owner_email=p_owner;
 INSERT INTO admin_security_events(owner_email,action) VALUES(p_owner,'passkey_direct_sign_in');
END $$;

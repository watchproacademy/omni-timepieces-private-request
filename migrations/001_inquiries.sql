CREATE TABLE IF NOT EXISTS inquiries (
 id text PRIMARY KEY, idempotency_key text UNIQUE NOT NULL, payload_hash text NOT NULL,
 payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
-- statement
CREATE TABLE IF NOT EXISTS delivery_jobs (
 id text PRIMARY KEY, inquiry_id text NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK (kind IN ('owner','receipt')), state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','sending','sent','failed','ambiguous')),
 attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz, lease_token text, first_attempt_at timestamptz, provider_id text, last_error text,
 published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(inquiry_id,kind)
);
-- statement
CREATE INDEX IF NOT EXISTS jobs_pending ON delivery_jobs(next_attempt_at) WHERE state IN ('pending','sending');
-- statement
CREATE TABLE IF NOT EXISTS abuse_windows (key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL);
-- statement
CREATE OR REPLACE FUNCTION accept_inquiry(p_id text,p_key text,p_hash text,p_payload jsonb,p_ip text,p_email text)
RETURNS TABLE(request_id text,duplicate boolean) LANGUAGE plpgsql AS $$
DECLARE previous inquiries%ROWTYPE; ip_count integer; email_count integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_key,0));
 SELECT * INTO previous FROM inquiries WHERE idempotency_key=p_key;
 IF FOUND THEN
  IF previous.payload_hash<>p_hash THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
  RETURN QUERY SELECT previous.id,true; RETURN;
 END IF;
 INSERT INTO abuse_windows(key,count,expires_at) VALUES ('ip:'||p_ip,1,now()+interval '1 hour')
 ON CONFLICT(key) DO UPDATE SET count=CASE WHEN abuse_windows.expires_at<=now() THEN 1 ELSE abuse_windows.count+1 END,
 expires_at=CASE WHEN abuse_windows.expires_at<=now() THEN now()+interval '1 hour' ELSE abuse_windows.expires_at END RETURNING count INTO ip_count;
 INSERT INTO abuse_windows(key,count,expires_at) VALUES ('email:'||p_email,1,now()+interval '1 day')
 ON CONFLICT(key) DO UPDATE SET count=CASE WHEN abuse_windows.expires_at<=now() THEN 1 ELSE abuse_windows.count+1 END,
 expires_at=CASE WHEN abuse_windows.expires_at<=now() THEN now()+interval '1 day' ELSE abuse_windows.expires_at END RETURNING count INTO email_count;
 IF ip_count>10 OR email_count>3 THEN RAISE EXCEPTION 'RATE_LIMITED'; END IF;
 INSERT INTO inquiries(id,idempotency_key,payload_hash,payload) VALUES(p_id,p_key,p_hash,p_payload);
 INSERT INTO delivery_jobs(id,inquiry_id,kind) VALUES(p_id||':owner',p_id,'owner'),(p_id||':receipt',p_id,'receipt');
 RETURN QUERY SELECT p_id,false;
END $$;

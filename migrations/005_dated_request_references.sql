-- Preserve references already printed in emails; aliases expire with their inquiry.
CREATE TABLE IF NOT EXISTS request_reference_aliases (
 reference text PRIMARY KEY,
 inquiry_id text NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE
);
-- statement
CREATE TABLE IF NOT EXISTS request_reference_counters (
 request_day date PRIMARY KEY,
 last_number bigint NOT NULL CHECK(last_number > 0)
);
-- statement
CREATE OR REPLACE FUNCTION dated_request_reference(received_at timestamptz) RETURNS text LANGUAGE plpgsql VOLATILE AS $$
DECLARE request_day date := (received_at AT TIME ZONE 'America/New_York')::date;
 sequence_number bigint; alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ'; suffix text := ''; entropy bytea; i integer;
BEGIN
 INSERT INTO request_reference_counters AS counters VALUES(request_day,1)
 ON CONFLICT ON CONSTRAINT request_reference_counters_pkey
 DO UPDATE SET last_number=counters.last_number+1 RETURNING last_number INTO sequence_number;
 entropy := decode(md5(gen_random_uuid()::text),'hex');
 FOR i IN 0..3 LOOP
  suffix := suffix || substr(alphabet,1+(get_byte(entropy,i)%length(alphabet)),1);
 END LOOP;
 RETURN 'OMNI-WR'||to_char(request_day,'YYYYMMDD')||'-'||
 lpad(sequence_number::text,greatest(4,length(sequence_number::text)),'0')||'-'||suffix;
END $$;
-- statement
-- Retain the old no-argument entry point so re-running migration 004 is harmless.
CREATE OR REPLACE FUNCTION new_request_reference() RETURNS text LANGUAGE sql VOLATILE AS $$
 SELECT dated_request_reference(now());
$$;
-- statement
DO $$
DECLARE inquiry record;
BEGIN
 -- Prevent new inserts from interleaving with chronological backfill.
 LOCK TABLE inquiries IN SHARE ROW EXCLUSIVE MODE;
 FOR inquiry IN SELECT id,public_reference,created_at FROM inquiries
 WHERE public_reference !~ '^OMNI-WR[0-9]{8}-([ABCDEU]X?)?[0-9]{4,}-[A-Z]{4}$' ORDER BY created_at,id LOOP
  INSERT INTO request_reference_aliases VALUES(inquiry.public_reference,inquiry.id) ON CONFLICT DO NOTHING;
  UPDATE inquiries SET public_reference=dated_request_reference(inquiry.created_at) WHERE id=inquiry.id;
 END LOOP;
END $$;

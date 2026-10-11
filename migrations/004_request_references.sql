ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS public_reference text;
-- statement
CREATE UNIQUE INDEX IF NOT EXISTS inquiries_public_reference_unique ON inquiries(public_reference);
-- statement
CREATE OR REPLACE FUNCTION new_request_reference() RETURNS text LANGUAGE plpgsql VOLATILE AS $$
DECLARE alphabet text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; candidate text; entropy bytea; i integer;
BEGIN
 -- Serialize allocation, including collision checks, across concurrent submissions.
 PERFORM pg_advisory_xact_lock(684912370);
 LOOP
  entropy := decode(md5(gen_random_uuid()::text),'hex');
  candidate := '';
  FOR i IN 0..7 LOOP
   candidate := candidate || substr(alphabet,1+(get_byte(entropy,i)%length(alphabet)),1);
  END LOOP;
  candidate := 'OMNI-' || substr(candidate,1,4) || '-' || substr(candidate,5,4);
  IF NOT EXISTS(SELECT 1 FROM inquiries WHERE public_reference=candidate) THEN RETURN candidate; END IF;
 END LOOP;
END $$;
-- statement
ALTER TABLE inquiries ALTER COLUMN public_reference SET DEFAULT new_request_reference();
-- statement
UPDATE inquiries SET public_reference=new_request_reference() WHERE public_reference IS NULL;
-- statement
ALTER TABLE inquiries ALTER COLUMN public_reference SET NOT NULL;

CREATE OR REPLACE FUNCTION request_value_tier(amount numeric) RETURNS text LANGUAGE sql IMMUTABLE AS $$
 SELECT CASE WHEN amount < 15000 THEN 'A' WHEN amount < 100000 THEN 'B'
 WHEN amount < 500000 THEN 'C' WHEN amount <= 1000000 THEN 'D' ELSE 'E' END;
$$;
-- statement
CREATE OR REPLACE FUNCTION request_reference_classification(request_payload jsonb) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE watch jsonb; minimum numeric; maximum numeric; total_min numeric := 0; total_max numeric := 0;
 unknown boolean := false; multiple text := ''; watches jsonb := request_payload->'watches';
BEGIN
 IF jsonb_typeof(watches) IS DISTINCT FROM 'array' THEN RETURN 'U'; END IF;
 IF jsonb_array_length(watches)>1 THEN multiple := 'X'; END IF;
 IF jsonb_array_length(watches)=0 THEN RETURN 'U'; END IF;
 FOR watch IN SELECT value FROM jsonb_array_elements(watches) LOOP
  CASE watch->>'budget'
   WHEN 'Under $15,000' THEN minimum:=0; maximum:=14999.99;
   WHEN '$15,000–$30,000' THEN minimum:=15000; maximum:=30000;
   WHEN '$30,000–$60,000' THEN minimum:=30000; maximum:=60000;
   WHEN '$60,000–$100,000' THEN minimum:=60000; maximum:=100000;
   WHEN '$100,000–$250,000' THEN minimum:=100000; maximum:=250000;
   WHEN 'Custom' THEN
    IF jsonb_typeof(watch->'budgetMax') IS DISTINCT FROM 'number' OR
       (watch ? 'budgetMin' AND jsonb_typeof(watch->'budgetMin') IS DISTINCT FROM 'number') THEN
     unknown:=true; CONTINUE;
    END IF;
    minimum:=COALESCE((watch->>'budgetMin')::numeric,0); maximum:=(watch->>'budgetMax')::numeric;
    IF minimum<0 OR maximum<=0 OR minimum>maximum THEN unknown:=true; CONTINUE; END IF;
   ELSE unknown:=true; CONTINUE;
  END CASE;
  total_min:=total_min+minimum; total_max:=total_max+maximum;
 END LOOP;
 IF unknown OR request_value_tier(total_min)<>request_value_tier(total_max) THEN RETURN 'U'||multiple; END IF;
 RETURN request_value_tier(total_min)||multiple;
END $$;
-- statement
CREATE OR REPLACE FUNCTION classify_new_request_reference() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 NEW.public_reference := regexp_replace(NEW.public_reference,
 '^(OMNI-WR[0-9]{8}-)([0-9]{4,}-[A-Z]{4})$',
 '\1'||request_reference_classification(NEW.payload)||'\2');
 RETURN NEW;
END $$;
-- statement
CREATE OR REPLACE TRIGGER classify_request_reference BEFORE INSERT ON inquiries
 FOR EACH ROW EXECUTE FUNCTION classify_new_request_reference();
-- statement
DO $$
DECLARE inquiry record;
BEGIN
 LOCK TABLE inquiries IN SHARE ROW EXCLUSIVE MODE;
 FOR inquiry IN SELECT id,public_reference,payload FROM inquiries
 WHERE public_reference ~ '^OMNI-WR[0-9]{8}-[0-9]{4,}-[A-Z]{4}$' LOOP
  INSERT INTO request_reference_aliases VALUES(inquiry.public_reference,inquiry.id) ON CONFLICT DO NOTHING;
  UPDATE inquiries SET public_reference=regexp_replace(inquiry.public_reference,
   '^(OMNI-WR[0-9]{8}-)([0-9]{4,}-[A-Z]{4})$',
   '\1'||request_reference_classification(inquiry.payload)||'\2') WHERE id=inquiry.id;
 END LOOP;
END $$;

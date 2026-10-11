CREATE OR REPLACE FUNCTION request_brand_code(request_payload jsonb) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE brands text[]; brand text;
BEGIN
 IF jsonb_typeof(request_payload->'watches') IS DISTINCT FROM 'array' THEN RETURN 'UNK'; END IF;
 SELECT array_agg(DISTINCT regexp_replace(lower(COALESCE(value->>'brand','')),'[^a-z0-9]','','g')) INTO brands FROM jsonb_array_elements(request_payload->'watches');
 IF COALESCE(cardinality(brands),0)=0 THEN RETURN 'UNK'; END IF;
 IF cardinality(brands)>1 THEN RETURN 'MIX'; END IF;
 brand:=brands[1];
 RETURN CASE brand WHEN 'rolex' THEN 'RLX' WHEN 'patekphilippe' THEN 'PP'
 WHEN 'richardmille' THEN 'RM' WHEN 'audemarspiguet' THEN 'AP' WHEN 'fpjourne' THEN 'FPJ'
 WHEN 'vacheronconstantin' THEN 'VC' WHEN 'cartier' THEN 'CAR'
 WHEN '' THEN 'UNK' WHEN 'opentoguidance' THEN 'UNK' WHEN 'notsure' THEN 'UNK'
 WHEN 'undecided' THEN 'UNK' WHEN 'other' THEN 'OTH' ELSE 'OTH' END;
END $$;
-- statement
CREATE OR REPLACE FUNCTION classify_new_request_reference() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 NEW.public_reference := regexp_replace(NEW.public_reference,
 '^(OMNI-WR[0-9]{8}-)([0-9]{4,}-)([A-Z]{4})$',
 '\1'||request_reference_classification(NEW.payload)||'\2'||request_brand_code(NEW.payload)||'\3');
 RETURN NEW;
END $$;
-- statement
DO $$
DECLARE inquiry record;
BEGIN
 LOCK TABLE inquiries IN SHARE ROW EXCLUSIVE MODE;
 FOR inquiry IN SELECT id,public_reference,payload FROM inquiries
 WHERE public_reference ~ '^OMNI-WR[0-9]{8}-[ABCDEU]X?[0-9]{4,}-[A-Z]{4}$' LOOP
  INSERT INTO request_reference_aliases VALUES(inquiry.public_reference,inquiry.id) ON CONFLICT DO NOTHING;
  UPDATE inquiries SET public_reference=regexp_replace(inquiry.public_reference,
   '^(OMNI-WR[0-9]{8}-[ABCDEU]X?[0-9]{4,}-)([A-Z]{4})$',
   '\1'||request_brand_code(inquiry.payload)||'\2') WHERE id=inquiry.id;
 END LOOP;
END $$;

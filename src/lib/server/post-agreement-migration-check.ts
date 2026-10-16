/** Preserve all historical values and file visibility; no funds/KYC assent is inferred. */
export const postAgreementPreservationBefore=`
CREATE TEMP TABLE omni_post_agreement_preservation(table_name text PRIMARY KEY,row_count bigint,digest text) ON COMMIT DROP;
DO $$ DECLARE t record; n bigint; h text; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename LOOP
  EXECUTE format('LOCK TABLE public.%I IN SHARE ROW EXCLUSIVE MODE',t.tablename);
  EXECUTE format('SELECT count(*),md5(COALESCE(string_agg(md5(to_jsonb(r)::text),'''' ORDER BY md5(to_jsonb(r)::text)),'''')) FROM public.%I r',t.tablename) INTO n,h;
  INSERT INTO omni_post_agreement_preservation VALUES(t.tablename,n,h);
 END LOOP;
END $$;`;
export const postAgreementPreservationAfter=`
DO $$ DECLARE t record; n bigint; h text; BEGIN
 FOR t IN SELECT * FROM omni_post_agreement_preservation LOOP
  EXECUTE format('SELECT count(*),md5(COALESCE(string_agg(md5(to_jsonb(r)::text),'''' ORDER BY md5(to_jsonb(r)::text)),'''')) FROM public.%I r',t.table_name) INTO n,h;
  IF n<>t.row_count OR h<>t.digest THEN RAISE EXCEPTION 'MIGRATION_PRESERVATION_FAILED'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM transaction_workflows) OR EXISTS(SELECT 1 FROM transaction_actions) OR EXISTS(SELECT 1 FROM transaction_files) OR EXISTS(SELECT 1 FROM request_closures) THEN RAISE EXCEPTION 'TRANSACTION_BACKFILL_FORBIDDEN'; END IF;
END $$;`;

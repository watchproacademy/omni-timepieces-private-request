/** Snapshot existing rows inside the migration transaction without exposing record contents. */
export const commercialPreservationBefore=`
CREATE TEMP TABLE omni_commercial_preservation(table_name text PRIMARY KEY,row_count bigint,digest text) ON COMMIT DROP;
DO $$ DECLARE t record; n bigint; h text; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename LOOP
  EXECUTE format('LOCK TABLE public.%I IN SHARE ROW EXCLUSIVE MODE',t.tablename);
  EXECUTE format('SELECT count(*),md5(COALESCE(string_agg(md5((to_jsonb(r)-''customer_visible'')::text),'''' ORDER BY md5((to_jsonb(r)-''customer_visible'')::text)),'''')) FROM public.%I r',t.tablename) INTO n,h;
  INSERT INTO omni_commercial_preservation VALUES(t.tablename,n,h);
 END LOOP;
END $$;`;
export const commercialPreservationAfter=`
DO $$ DECLARE t record; n bigint; h text; BEGIN
 FOR t IN SELECT * FROM omni_commercial_preservation LOOP
  EXECUTE format('SELECT count(*),md5(COALESCE(string_agg(md5((to_jsonb(r)-''customer_visible'')::text),'''' ORDER BY md5((to_jsonb(r)-''customer_visible'')::text)),'''')) FROM public.%I r',t.table_name) INTO n,h;
  IF n<>t.row_count OR h<>t.digest THEN RAISE EXCEPTION 'MIGRATION_PRESERVATION_FAILED'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM request_files WHERE customer_visible IS NOT TRUE AND NOT EXISTS(SELECT 1 FROM commercial_documents d WHERE d.file_id=request_files.id)) THEN RAISE EXCEPTION 'LEGACY_VISIBILITY_CHANGED'; END IF;
END $$;`;

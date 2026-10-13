import {z} from 'zod';
import {database} from './db';
import {requestStages} from '../request-workflow';
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v);return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,10)===v;});
export const requestFilters=z.object({period:z.enum(['all','today','week','fortnight','month','year','custom']).default('all'),from:date.optional(),to:date.optional(),stage:z.enum(['all','waiting','cancelled',...requestStages]).default('all'),attention:z.enum(['all','review','unpaid','reply']).default('all'),q:z.string().trim().max(100).default(''),page:z.coerce.number().int().min(1).max(100000).default(1)}).refine(v=>v.period!=='custom'||(!!v.from&&!!v.to&&v.from<=v.to));
export const requestListSql=`WITH filtered AS (
 SELECT i.id,i.public_reference AS reference,i.created_at,COALESCE(i.request_details,i.payload)->'contact'->>'fullName' AS name,COALESCE(i.request_details,i.payload)->'watches'->0->>'brand' AS brand,COALESCE(i.request_details,i.payload)->'watches'->0->>'model' AS model,
 (SELECT jsonb_agg(COALESCE(p.stage,'received')) FROM jsonb_array_elements(COALESCE(i.request_details,i.payload)->'watches') w LEFT JOIN watch_progress p ON p.inquiry_id=i.id AND p.watch_id=w->>'id') AS stages
 FROM inquiries i LEFT JOIN request_reviews r ON r.inquiry_id=i.id
 WHERE COALESCE(i.retention_until,i.created_at+interval '1 year')>now()
 AND ($1='all' OR (i.created_at AT TIME ZONE 'America/New_York')::date BETWEEN
 CASE $1 WHEN 'today' THEN (now() AT TIME ZONE 'America/New_York')::date WHEN 'week' THEN date_trunc('week',now() AT TIME ZONE 'America/New_York')::date WHEN 'fortnight' THEN (now() AT TIME ZONE 'America/New_York')::date-13 WHEN 'month' THEN date_trunc('month',now() AT TIME ZONE 'America/New_York')::date WHEN 'year' THEN date_trunc('year',now() AT TIME ZONE 'America/New_York')::date ELSE $2::date END
 AND CASE WHEN $1='custom' THEN $3::date ELSE (now() AT TIME ZONE 'America/New_York')::date END)
 AND ($4='all' OR EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(i.request_details,i.payload)->'watches') w LEFT JOIN watch_progress p ON p.inquiry_id=i.id AND p.watch_id=w->>'id' WHERE CASE WHEN p.stage='quoted' THEN 'quote_sent' ELSE COALESCE(p.stage,'received') END=$4))
 AND ($5='' OR strpos(lower(concat_ws(' ',i.public_reference,COALESCE(i.request_details,i.payload)->'contact'->>'fullName',COALESCE(i.request_details,i.payload)->'watches'::text)),lower($5))>0)
 AND ($6='all' OR ($6='review' AND r.state IN ('submitted','in_review')) OR ($6='unpaid' AND EXISTS(SELECT 1 FROM watch_progress p WHERE p.inquiry_id=i.id AND p.stage='invoice_sent' AND p.paid_at IS NULL)) OR ($6='reply' AND (SELECT n.author FROM request_notes n WHERE n.inquiry_id=i.id AND n.visibility='customer' ORDER BY n.created_at DESC,n.id DESC LIMIT 1)='customer'))
), page AS (SELECT * FROM filtered ORDER BY created_at DESC,id DESC LIMIT 50 OFFSET $7)
 SELECT (SELECT count(*)::int FROM filtered) AS total,COALESCE((SELECT jsonb_agg(page ORDER BY created_at DESC,id DESC) FROM page),'[]'::jsonb) AS requests`;
export async function listRequests(params:URLSearchParams){
 const parsed=requestFilters.safeParse(Object.fromEntries(params));if(!parsed.success)throw new Error('INVALID_INPUT');
 const v=parsed.data;const [result]=await database().query(requestListSql,[v.period,v.from||null,v.to||null,v.stage,v.q,v.attention,(v.page-1)*50]);
 return {...result,page:v.page,pageSize:50};
}

import {test} from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';
import {requestFilters,requestListSql} from '../../src/lib/server/request-list';
test('request filters validate dates, ranges and pagination',()=>{assert.equal(requestFilters.safeParse({period:'custom',from:'2026-02-30',to:'2026-03-02'}).success,false);assert.equal(requestFilters.safeParse({period:'custom',from:'2026-03-02',to:'2026-03-01'}).success,false);assert.equal(requestFilters.safeParse({page:'0'}).success,false);assert.equal(requestFilters.parse({}).period,'all');});
test('request list filters all records before pagination, matches any watch and uses Miami dates',async()=>{
 const db=new PGlite();try{
 await db.exec(`CREATE TABLE inquiries(id text,public_reference text,created_at timestamptz,retention_until timestamptz,payload jsonb);CREATE TABLE request_reviews(inquiry_id text,state text);CREATE TABLE watch_progress(inquiry_id text,watch_id text,stage text,paid_at timestamptz);CREATE TABLE request_notes(id text,inquiry_id text,author text,visibility text,created_at timestamptz);`);
 for(let i=0;i<55;i++)await db.query("INSERT INTO inquiries VALUES($1,$1,'2026-10-11T02:00:00Z',now()+interval '1 year',$2)",[String(i),JSON.stringify({contact:{fullName:'Client '+i},watches:[{id:'w1',brand:'Rolex',model:'Daytona'},{id:'w2',brand:'Patek Philippe',model:'Nautilus'}]})]);
 await db.exec("INSERT INTO watch_progress VALUES('0','w2','invoice_sent',null);INSERT INTO request_reviews VALUES('1','submitted');INSERT INTO request_notes VALUES('n','2','customer','customer',now())");
 const list=async(p='all',from:string|null=null,to:string|null=null,stage='all',q='',attention='all',offset=0)=>(await db.query<{total:number;requests:{id:string}[]}>(requestListSql,[p,from,to,stage,q,attention,offset])).rows[0];
 assert.equal((await list()).total,55);assert.equal((await list()).requests.length,50);assert.equal((await list('all',null,null,'all','','all',50)).requests.length,5);
 assert.equal((await list('custom','2026-10-10','2026-10-10')).total,55);assert.equal((await list('custom','2026-10-11','2026-10-11')).total,0);
 assert.equal((await list('all',null,null,'invoice_sent')).requests[0].id,'0');assert.equal((await list('all',null,null,'all','Nautilus')).total,55);
 for(const [attention,id] of [['unpaid','0'],['review','1'],['reply','2']])assert.equal((await list('all',null,null,'all','',attention)).requests[0].id,id);
 }finally{await db.close();}
});

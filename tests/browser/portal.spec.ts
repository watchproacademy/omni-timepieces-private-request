import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const record={id:'TEST-PORTAL',reference:'OMNI-7K9M-4R2X',watches:[{id:'w',title:'Rolex Submariner',stage:'paid',version:2,carrier:'',trackingNumber:'',trackingUrl:''}],review:{state:'requested',version:1,requirements:['identity','address'],form:{}},files:[],notes:[],events:[]};
test('customer dashboard exposes requested documents and messages, without operator controls',async({page})=>{
 test.skip(process.env.REQUEST_PORTAL_ENABLED!=='true');
 await page.route('**/api/request-status/portal**',route=>route.fulfill({json:{role:'customer',request:record}}));
 await page.goto('/request-status');await expect(page.getByRole('heading',{name:'Rolex Submariner'})).toBeVisible();
 await expect(page.locator('.tracking-reference')).toHaveText('OMNI-7K9M-4R2X');
 await expect(page.getByLabel('Upload identity document')).toBeVisible();await expect(page.getByLabel('Upload proof of address')).toBeVisible();
 await expect(page.getByRole('button',{name:'Submit for review'})).toBeVisible();await expect(page.getByLabel('Update stage')).toHaveCount(0);
 await expect(page.getByText('Internal operator note only')).toHaveCount(0);
});
test('operator can independently record shipping and internal notes',async({page})=>{
 test.skip(process.env.REQUEST_PORTAL_ENABLED!=='true'||process.env.OMNI_PORTAL_MODE!=='internal','Requires the separately protected internal deployment');let update:Record<string,unknown>|undefined;
 await page.route('**/api/request-status/portal**',async route=>{if(route.request().method()==='POST'){update=route.request().postDataJSON();await route.fulfill({json:{ok:true}});}else await route.fulfill({json:{role:'owner',request:{...record,review:{...record.review,state:'approved'}}}});});
 await page.goto('/private-desk');await page.getByLabel('Update stage').selectOption('shipped');await page.getByText('Shipping details',{exact:true}).click();
 await page.getByLabel('Carrier',{exact:true}).fill('UPS');await page.getByLabel('Tracking number',{exact:true}).fill('SYNTHETIC-123');
 await page.getByRole('button',{name:'Save stage & notify customer'}).click();await expect.poll(()=>update?.stage).toBe('shipped');
 await page.getByLabel('Visibility').selectOption('internal');await page.getByLabel('New message or note').fill('Internal test');await page.getByRole('button',{name:'Send message'}).click();await expect.poll(()=>update?.visibility).toBe('internal');
});
test('document upload rejects oversized files before transmission',async({page})=>{
 test.skip(process.env.REQUEST_PORTAL_ENABLED!=='true');let uploads=0;
 await page.route('**/api/request-status/portal**',route=>route.fulfill({json:{role:'customer',request:record}}));
 await page.route('**/api/request-status/files**',route=>{uploads++;return route.fulfill({json:{ok:true}});});
 await page.goto('/request-status');await page.getByLabel('Upload identity document').setInputFiles({name:'synthetic.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(3*1024*1024+1)});
 await page.locator('.portal-upload').filter({has:page.getByLabel('Upload identity document')}).getByRole('button',{name:'Upload securely',exact:true}).click();
 await expect(page.getByText('Please choose a file smaller than 3 MB.')).toBeVisible();expect(uploads).toBe(0);
});

test('portal remains accessible in light and dark themes',async({page})=>{
 test.skip(process.env.REQUEST_PORTAL_ENABLED!=='true');
 await page.route('**/api/request-status/portal**',route=>route.fulfill({json:{role:'customer',request:record}}));
 await page.goto('/request-status');await expect(page.getByRole('heading',{name:'Rolex Submariner'})).toBeVisible();
 for(const name of ['Light appearance','Dark appearance']){
  await page.getByRole('radio',{name}).click();
  const result=await new AxeBuilder({page}).include('main').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
 }
});

test('linear progress advances per watch and handles completion and paused requests',async({page})=>{
 test.skip(process.env.REQUEST_PORTAL_ENABLED!=='true');
 let stage='received';
 await page.route('**/api/request-status/portal**',route=>route.fulfill({json:{role:'customer',request:{...record,watches:[{...record.watches[0],stage}]}}}));
 await page.goto('/request-status');
 const progress=page.getByRole('progressbar',{name:'Rolex Submariner request progress'});
 await expect(progress).toHaveAttribute('aria-valuenow','1');
 for(const [next,value] of [['paid','5'],['delivered','9']]){
  stage=next;await page.getByRole('button',{name:'Refresh updates'}).click();await expect(progress).toHaveAttribute('aria-valuenow',value);
 }
 await expect(page.getByText('Your timepiece has arrived.')).toBeVisible();
 await page.getByText('View all stages',{exact:true}).click();await expect(page.locator('.request-progress-details [aria-current="step"]')).toHaveText(/Delivered/);
 stage='waiting';await page.getByRole('button',{name:'Refresh updates'}).click();await expect(page.getByText('On hold',{exact:true})).toBeVisible();await expect(progress).toHaveCount(0);
 stage='cancelled';await page.getByRole('button',{name:'Refresh updates'}).click();await expect(page.getByText('Request cancelled',{exact:true})).toBeVisible();await expect(progress).toHaveCount(0);
});

test('public customer portal exposes no operator entry point',async({page})=>{
 test.skip(process.env.OMNI_PORTAL_MODE==='internal');
 await page.route('**/api/request-status/portal**',route=>route.fulfill({status:401,json:{message:'Sign in'}}));
 await page.route('**/api/request-status',route=>route.fulfill({status:401,json:{message:'Sign in'}}));
 await page.goto('/request-status');
 await expect(page.getByLabel('Request reference')).toBeVisible();
 await expect(page.getByRole('button',{name:'Private desk sign-in'})).toHaveCount(0);
 const response=await page.goto('/private-desk');expect(response?.status()).toBe(404);
 await expect(page.getByRole('button',{name:'Email my private link'})).toHaveCount(0);
});

test('operator filters dates, stages and attention on the server',async({page})=>{
 test.skip(process.env.OMNI_PORTAL_MODE!=='internal');
 let last='';await page.route('**/api/request-status/portal**',async route=>{last=route.request().url();await route.fulfill({json:{role:'owner',requests:[{id:'test',reference:'OMNI-TEST',name:'Test customer',brand:'Rolex',model:'Daytona',created_at:'2026-10-11T02:00:00Z',stages:['invoice_sent']}],total:51,page:new URL(last).searchParams.get('page')==='2'?2:1,pageSize:50}});});
 await page.goto('/private-desk');await expect(page.getByText('51 matching requests')).toBeVisible();
 await page.getByLabel('Date received').selectOption('fortnight');await page.getByRole('combobox',{name:'Stage',exact:true}).selectOption('invoice_sent');await page.getByLabel('Needs attention').selectOption('unpaid');await page.getByRole('button',{name:'Apply filters'}).click();
 await expect.poll(()=>last).toContain('period=fortnight');await expect.poll(()=>last).toContain('attention=unpaid');await expect(page.getByText('51 matching requests')).toBeVisible();await page.getByRole('button',{name:'Next',exact:true}).click();await expect.poll(()=>last).toContain('page=2');
 await page.getByRole('button',{name:'Refresh updates',exact:true}).click();await expect.poll(()=>last).toContain('page=2');await expect.poll(()=>last).toContain('attention=unpaid');await expect(page.getByText('51 matching requests')).toBeVisible();
});

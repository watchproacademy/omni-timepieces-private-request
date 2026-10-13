import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const record={id:'DEMO-ONE',reference:'OMNI-DEMO-ONE',customer:{name:'Demo customer',email:'demo@example.invalid'},watches:[{id:'w',title:'Rolex Submariner',stage:'received',version:1,carrier:'',trackingNumber:'',trackingUrl:''}],review:{state:'not_requested',version:1,requirements:[],form:{}},files:[],notes:[],events:[]};
const row={id:record.id,reference:record.reference,name:record.customer.name,brand:'Rolex',model:'Submariner',created_at:'2026-10-11T12:00:00Z',stages:['received']};
test('operator workspace retains filters, saves fresh versions, recovers errors, and fits desktop and iPhone',async({page},testInfo)=>{
 test.skip(process.env.OMNI_PORTAL_MODE!=='internal');
 const current=structuredClone(record);let fail=false;const posts:Record<string,unknown>[]=[];let listUrl='';
 await page.route('**/api/request-status/portal**',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(req.method()==='POST'){
   const body=req.postDataJSON();posts.push(body);
   if(fail){fail=false;return route.fulfill({status:409,json:{message:'Request changed. Refresh and try again.'}});}
   await new Promise(resolve=>setTimeout(resolve,150));
   if(body.action==='stage')current.watches[0]={...current.watches[0],stage:body.stage,version:current.watches[0].version+1};
   return route.fulfill({json:{ok:true}});
  }
  if(url.searchParams.has('id'))return route.fulfill({json:{role:'owner',request:current}});
  listUrl=url.href;return route.fulfill({json:{role:'owner',requests:[row,{...row,id:'DEMO-TWO',name:'Second demo customer',reference:'OMNI-DEMO-TWO'}],total:2,page:1,pageSize:50}});
 });
 await page.goto('/private-desk');await expect(page.getByRole('heading',{name:'Request queue'})).toBeVisible();
 await page.getByLabel('Search requests').fill('Demo');await page.getByText('Date, stage & attention',{exact:true}).click();await page.getByLabel('Date received').selectOption('week');await page.getByRole('button',{name:'Apply filters'}).click();await expect.poll(()=>listUrl).toContain('period=week');
 await page.getByRole('button',{name:/^Demo customer/}).click();await expect(page.getByRole('heading',{name:'Rolex Submariner',exact:true})).toBeVisible();
 await expect(page.getByText('Your request is with us')).toHaveCount(0);await expect(page.getByText('Nothing is needed from you right now.')).toHaveCount(0);
 const save=page.getByRole('button',{name:'Save stage & notify customer'});
 if(testInfo.project.name!=='mobile')expect((await save.boundingBox())!.y+(await save.boundingBox())!.height).toBeLessThan(page.viewportSize()!.height);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`artifacts/operator-dashboard/after-${testInfo.project.name}.png`,fullPage:true});
 for(const stage of ['sourcing','quote_sent']){
  await page.getByLabel('Update stage').selectOption(stage);await save.click();await expect(page.getByRole('status').filter({hasText:'Saved.'})).toBeVisible();
 }
 expect(posts.slice(0,2).map(p=>p.version)).toEqual([1,2]);
 fail=true;await save.click();await expect(page.getByText('Request changed. Refresh and try again.')).toBeVisible();await expect(save).toBeEnabled();
 await page.getByRole('button',{name:'Review',exact:true}).click();await expect(page.getByLabel('Review decision')).toBeVisible();await expect(page.getByLabel('Update stage')).toBeHidden();await page.screenshot({path:`artifacts/operator-dashboard/review-${testInfo.project.name}.png`,fullPage:true});
 await page.getByRole('button',{name:/^Documents \(/}).click();await expect(page.getByLabel('Upload invoice')).toBeVisible();
 await page.getByRole('button',{name:/^Messages \(/}).click();await page.getByLabel('Visibility').selectOption('internal');await page.getByLabel('New message or note').fill('Synthetic note');await page.getByRole('button',{name:'Save internal note'}).click();await expect(page.getByRole('status').filter({hasText:'Internal note saved.'})).toBeVisible();expect(posts.at(-1)?.visibility).toBe('internal');await expect(page.getByLabel('New message or note')).toHaveValue('');
 await page.getByRole('button',{name:'History',exact:true}).click();await expect(page.getByText('No recorded events.')).toBeVisible();
 for(const theme of ['Light appearance','Dark appearance']){await page.getByRole('radio',{name:theme}).click();for(const name of ['Watches','Review','Documents (0)','Messages (0)','History']){await page.getByRole('button',{name,exact:true}).click();expect((await new AxeBuilder({page}).include('main').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);}}
 await page.getByRole('button',{name:'Watches',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByLabel('Update stage')).toBeVisible();await page.getByRole('button',{name:'All requests',exact:true}).click();await expect(page.getByLabel('Search requests')).toHaveValue('Demo');await expect(page.getByLabel('Date received')).toHaveValue('week');
 await page.getByRole('button',{name:/^Second demo customer/}).click();await expect(page.getByLabel('Update stage')).toBeVisible();await expect(page.getByRole('button',{name:'Watches',exact:true})).toHaveAttribute('aria-current','page');
 await page.getByRole('button',{name:'All requests',exact:true}).click();await page.getByRole('button',{name:'Reset',exact:true}).click();await expect(page.getByLabel('Search requests')).toHaveValue('');await expect(page.getByLabel('Date received')).toHaveValue('all');await expect.poll(()=>listUrl).not.toContain('period=week');
});

test('multiple watches keep their own stage controls and client copy stays customer facing',async({page})=>{
 test.skip(process.env.OMNI_PORTAL_MODE!=='internal');
 await page.route('**/api/request-status/portal**',route=>route.fulfill({json:new URL(route.request().url()).searchParams.has('page')?{role:'owner',requests:[],total:0,page:1,pageSize:50}:{role:'owner',request:{...record,watches:[record.watches[0],{...record.watches[0],id:'second',title:'Cartier Santos',stage:'sourcing'}]}}}));
 await page.goto('/private-desk');await expect(page.getByRole('heading',{name:'Rolex Submariner',exact:true})).toBeVisible();await page.getByLabel('Watch',{exact:true}).selectOption('second');await expect(page.getByRole('heading',{name:'Cartier Santos',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Rolex Submariner',exact:true})).toBeHidden();await expect(page.getByLabel('Update stage').filter({visible:true})).toHaveValue('sourcing');
 await page.route('**/api/request-status/portal**',route=>route.fulfill({json:{role:'customer',request:record}}));await page.goto('/request-status');await expect(page.getByRole('heading',{name:'Your request is with us'})).toBeVisible();await expect(page.getByLabel('Update stage')).toHaveCount(0);
});

import {test,expect} from '@playwright/test';
// The legacy tracker is replaced by RequestDashboard when the portal is enabled.
// portal.spec.ts covers that deployment; these fixtures target legacy /api/request-status.
test.skip(process.env.REQUEST_PORTAL_ENABLED==='true','Legacy tracking requires REQUEST_PORTAL_ENABLED=false; portal coverage runs separately.');
test('private tracking is either explicitly unavailable or requires email access',async({page})=>{
 await page.goto('/request-status');await expect(page.getByRole('heading',{name:'Your request, at a glance.'})).toBeVisible();
 if(await page.getByText('Request tracking is being prepared.',{exact:false}).isVisible())return;
 await expect(page.getByLabel('Email',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Save update'})).toHaveCount(0);
});
test('private email link is removed from the address and customer progress never exposes owner controls',async({page})=>{
 await page.route('**/api/request-status*',async route=>{
 const method=route.request().method();
 if(method==='POST')return route.fulfill({json:{ok:true}});
 return route.fulfill({json:{role:'customer',request:{id:'WR-TEST',createdAt:'2026-10-11',watches:[{id:'watch',title:'Rolex Daytona',stage:'shipped',manualStage:'quoted',note:'Your watch is on its way.',tracking:[],payment:'PARTIALLY_PAID',linked:true,checkedAt:'2026-10-11T12:00:00Z',stale:false}]}}});
 });
 await page.goto('/request-status#access=private-test-token');
 if(await page.getByText('Request tracking is being prepared.',{exact:false}).isVisible()){test.skip(true,'Tracking disabled in the standard deployment; enabled suite runs separately.');return;}
 await expect(page.getByRole('button',{name:'Open private request',exact:true})).toBeVisible();await expect(page).toHaveURL(/\/request-status$/);
 await page.getByRole('button',{name:'Open private request',exact:true}).click();await expect(page.getByRole('heading',{name:'Rolex Daytona'})).toBeVisible();
 await expect(page.getByRole('progressbar',{name:'Rolex Daytona request progress'})).toHaveAttribute('aria-valuenow','5');await page.getByText('View all stages',{exact:true}).click();await expect(page.locator('.request-progress-details li').filter({hasText:'Paid'})).toHaveAttribute('data-reached','false');
 await expect(page.getByText('Update this watch',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('button',{name:'Email my private link'})).toBeVisible();
});
test('expired private link offers a new sign-in instead of showing request details',async({page})=>{
 await page.route('**/api/request-status*',route=>route.fulfill({status:401,json:{message:'This link expired or was already used. Request another link.'}}));
 await page.goto('/request-status#access=expired-token');
 if(await page.getByText('Request tracking is being prepared.',{exact:false}).isVisible()){test.skip(true,'Tracking disabled in the standard deployment; enabled suite runs separately.');return;}
 await page.getByRole('button',{name:'Open private request',exact:true}).click();await expect(page.locator('.tracking-message')).toContainText('expired');await expect(page.getByRole('button',{name:'Refresh updates'})).toHaveCount(0);
});
test('owner selects the matching Shopify item and saves a per-watch update',async({page})=>{
 let saved:Record<string,unknown>|undefined;
 await page.route('**/api/request-status*',async route=>{
  if(route.request().method()==='POST'){
   const input=route.request().postDataJSON();
   if(input.action==='order')return route.fulfill({json:{orderId:'gid://shopify/Order/123',name:'#1001',items:[{id:'gid://shopify/LineItem/456',title:'Rolex Daytona'}]}});
   saved=input;return route.fulfill({json:{ok:true}});
  }
  return route.fulfill({json:{role:'owner',request:{id:'WR-OWNER-TEST',createdAt:'2026-10-11',watches:[{id:'watch',title:'Rolex Daytona',stage:'sourcing',manualStage:'sourcing',note:'',tracking:[],payment:null,linked:false,checkedAt:null,stale:false,version:saved?1:0,orderId:'',lineId:''}]}}});
 });
 await page.goto('/request-status');
 if(await page.getByText('Request tracking is being prepared.',{exact:false}).isVisible()){test.skip(true,'Tracking disabled in the standard deployment; enabled suite runs separately.');return;}
 await page.getByText('Update this watch',{exact:true}).click();await page.getByLabel('Customer update',{exact:true}).fill('Quote sent to your email.');
 await page.getByLabel('Private desk stage').selectOption('quoted');await page.getByLabel('Shopify order address').fill('https://admin.shopify.com/store/11af59-2/orders/123');
 await page.getByRole('button',{name:'Find order items'}).click();await page.getByLabel('Watch in this order').selectOption('gid://shopify/LineItem/456');await page.getByRole('button',{name:'Save update'}).click();
 await expect.poll(()=>saved?.action).toBe('update');expect(saved).toMatchObject({requestId:'WR-OWNER-TEST',watchId:'watch',stage:'quoted',orderId:'gid://shopify/Order/123',lineId:'gid://shopify/LineItem/456',version:0});
});

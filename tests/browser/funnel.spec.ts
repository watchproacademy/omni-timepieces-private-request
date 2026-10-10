import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function start(page: Page, url = '/') {
 await page.goto(url);const begin=page.getByRole('button',{name:'Let’s get started'});if(await begin.isVisible())await begin.click();
 await expect(page.getByRole('button',{name:'Continue →',exact:true})).toBeEnabled();
}
async function next(page: Page) { await page.getByRole('button',{name:/^(Continue →|Save and return to review)$/}).click(); }
async function choose(page: Page, name: string, automatic = true) {
 const heading=page.locator('.step-content > h2');const before=await heading.textContent();
 await page.getByRole('radio',{name,exact:true}).click();
 if(automatic) await expect(heading).not.toHaveText(before!);
}
async function appearance(page: Page, name: 'Light'|'Dark') { const option=page.getByRole('radio',{name:`${name} appearance`,exact:true}); if(!await option.isVisible()) await page.locator('.appearance-menu summary').click(); await option.click(); await page.locator('.appearance-menu summary').click(); }
async function watch(page: Page, brand='Rolex',model='Daytona') {
 await choose(page,brand);await page.getByLabel('Model',{exact:true}).fill(model);await next(page);
 await choose(page,'For myself');await choose(page,'Pre-owned');await choose(page,'No fixed timeline');await choose(page,'Flexible');
 await expect(page.getByRole('heading',{name:'Would you like to trade a watch?'})).toBeVisible();
}
async function contact(page: Page) {
 await page.getByLabel('Full name',{exact:true}).fill('Test Client');await page.getByRole('textbox',{name:'Email',exact:true}).fill('test@example.com');await page.getByLabel('City / country',{exact:true}).fill('Miami, USA');await choose(page,'Email');
}
async function readyForReview(page: Page) { await start(page);await watch(page);await choose(page,'No');await contact(page); }
test('all nine steps auto advance where complete; email and consent remain required',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await start(page);await watch(page);await choose(page,'No');await next(page);
 await expect(page.getByRole('region',{name:'Private watch request'}).getByRole('alert')).toContainText('contact');
 await contact(page);await page.getByRole('button',{name:'Send private request'}).click();
 await expect(page.getByRole('region',{name:'Private watch request'}).getByRole('alert')).toBeVisible();
 await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Send private request'}).click();
 await expect(page.getByText('Demo complete. No request or email was sent.')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Your concierge will take it from here.'})).toBeFocused();
 await expect(page.getByRole('button',{name:'Copy request ID'})).toBeVisible();expect(errors).toEqual([]);
});
test('prefill, dependent model resets, and draft restoration preserve the active watch',async({page})=>{
 await start(page,'/?brand=Rolex&model=Daytona&reference=126500LN&utm_source=test');await next(page);
 await expect(page.getByLabel('Model',{exact:true})).toHaveValue('Daytona');await expect(page.getByRole('combobox',{name:'Reference',exact:true})).toHaveValue('126500LN');
 await page.getByLabel('Model',{exact:true}).fill('Datejust');await expect(page.getByRole('combobox',{name:'Reference',exact:true})).toHaveValue('');await page.waitForTimeout(250);
 await page.evaluate(()=>history.replaceState(null,'','/'));await page.reload();const begin=page.getByRole('button',{name:'Let’s get started'});if(await begin.isVisible())await begin.click();await expect(page.getByLabel('Model',{exact:true})).toHaveValue('Datejust');
});
test('multiple watches and trades retain details and review edits return directly',async({page})=>{
 await start(page);await watch(page);await page.getByRole('button',{name:'Add another requested watch'}).click();await watch(page,'Rolex','Datejust');await choose(page,'Yes',false);
 await page.getByLabel('Trade brand',{exact:true}).fill('Rolex');await page.getByLabel('Trade model',{exact:true}).fill('Submariner');await page.getByLabel('Trade condition',{exact:true}).selectOption('Good');await page.getByLabel('Trade presentation',{exact:true}).selectOption('Watch only');
 await page.getByRole('button',{name:'Add another trade-in'}).click();await page.getByLabel('Trade brand',{exact:true}).fill('Omega');await page.getByLabel('Trade model',{exact:true}).fill('Speedmaster');await page.getByLabel('Trade condition',{exact:true}).selectOption('Excellent');await page.getByLabel('Trade presentation',{exact:true}).selectOption('Watch only');await next(page);await contact(page);
 await expect(page.getByRole('heading',{name:'Watch 1 · Rolex Daytona'})).toBeVisible();await expect(page.getByRole('heading',{name:'Watch 2 · Rolex Datejust'})).toBeVisible();await expect(page.getByText('1. Rolex Submariner',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Edit timing for watch 1'}).click();await choose(page,'Within 2 weeks');await expect(page.getByRole('heading',{name:'Does everything look right?'})).toBeVisible();
 await page.getByRole('button',{name:'Edit watch 1',exact:true}).click();await expect(page.getByLabel('Model',{exact:true})).toHaveValue('Daytona');await page.getByRole('button',{name:'Remove watch 2'}).click();await expect(page.getByRole('button',{name:'Remove watch 2'})).toHaveCount(0);await page.getByRole('button',{name:'← Back',exact:true}).click();await choose(page,'Other',false);await page.getByLabel('Brand name',{exact:true}).fill('Independent atelier');await next(page);await expect(page.getByRole('heading',{name:'What are we looking for today?'})).toBeVisible();await page.getByLabel('Model or collection',{exact:true}).fill('Rare reference');await next(page);await expect(page.getByRole('heading',{name:'Does everything look right?'})).toBeVisible();
});
test('guidance dialog applies reviewed details and Escape closes it',async({page})=>{
 await start(page);await choose(page,'Rolex');await page.getByLabel('Model',{exact:true}).fill('Daytona');await next(page);await choose(page,'For myself');await choose(page,'Pre-owned');await choose(page,'No fixed timeline');await choose(page,'Custom',false);await page.getByRole('spinbutton',{name:'From (USD)',exact:true}).fill('40000');await page.getByLabel('Up to (USD)',{exact:true}).fill('50000');await next(page);await page.getByRole('button',{name:'Watch 1 · Rolex Daytona',exact:true}).click();await page.getByRole('button',{name:'I’d like your guidance'}).click();await page.getByLabel('Your description',{exact:true}).fill('A blue Rolex GMT-Master II on Jubilee under $30k');await page.getByRole('button',{name:'Review suggestions'}).click();await page.getByLabel('Your description',{exact:true}).fill('A blue Rolex GMT-Master II on Jubilee under $30k, pre-owned');await expect(page.getByRole('button',{name:'Use these details'})).toHaveCount(0);await page.getByRole('button',{name:'Review suggestions'}).click();await page.getByRole('button',{name:'Use these details'}).click();await expect(page.getByLabel('Model',{exact:true})).toHaveValue('GMT-Master II');await page.getByRole('button',{name:'I’d like your guidance'}).click();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();await expect(page.getByRole('heading',{name:'What are we looking for today?'})).toBeVisible();await next(page);await choose(page,'For myself');await choose(page,'Pre-owned');await choose(page,'No fixed timeline');await expect(page.getByRole('spinbutton',{name:'From (USD)',exact:true})).toHaveValue('');await expect(page.getByLabel('Up to (USD)',{exact:true})).toHaveValue('30000');
});
test('failed submissions retain the draft and retry with one idempotency key',async({page})=>{
 const keys:string[]=[];await page.route('**/api/watch-request',async route=>{keys.push(route.request().headers()['idempotency-key']);await route.fulfill({status:keys.length===1?503:202,json:keys.length===1?{message:'Please retry.'}:{status:'accepted',preview:true,requestId:'DEMO-TEST'}});});
 await readyForReview(page);await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Send private request'}).click();await expect(page.getByRole('region',{name:'Private watch request'}).getByRole('alert')).toContainText('Please retry');await page.getByRole('button',{name:'Send private request'}).click();await expect(page.getByText('DEMO-TEST',{exact:true})).toBeVisible();expect(keys[0]).toBe(keys[1]);
});
test('both themes, narrow reflow and accessible controls',async({page})=>{
 await start(page);for(const theme of ['Light','Dark'] as const){await appearance(page,theme);await expect(page.locator('html')).toHaveAttribute('data-theme',theme.toLowerCase());expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);}
 await page.setViewportSize({width:320,height:500});const begin=page.getByRole('button',{name:'Let’s get started'});if(await begin.isVisible())await begin.click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole('button',{name:'Continue →'}).scrollIntoViewIfNeeded();await expect(page.getByRole('button',{name:'Continue →'})).toBeVisible();
});
test('public content, metadata, redirects and the compact menu remain crawlable',async({request,page})=>{
 const html=await(await request.get('/brands/rolex')).text();expect(html).toContain('Shape the configuration');expect(html).toContain('rel="canonical"');expect(html).toContain('BreadcrumbList');expect(html).toContain('noindex');
 await page.goto('/');await page.locator('.request-menu summary').click();await page.getByRole('link',{name:'Our service',exact:true}).click();await expect(page.getByRole('heading',{level:1})).toHaveText('Private watch sourcing');
 const redirect=await request.get('/index.html?brand=Rolex',{maxRedirects:0});expect(redirect.status()).toBe(308);expect(redirect.headers().location).toContain('?brand=Rolex');expect(await(await request.get('/llms.txt')).text()).toContain('Catalog entries are examples');expect(await(await request.get('/robots.txt')).text()).toContain('Disallow: /');
});
test('rare brands, custom trade descriptions and phone follow-up stay open until complete',async({page})=>{
 await start(page);await choose(page,'Other',false);await page.getByLabel('Brand name',{exact:true}).fill('Independent atelier');await next(page);await page.getByRole('button',{name:'I’d like your guidance',exact:true}).click();await page.getByRole('button',{name:'Keep model open',exact:true}).click();await next(page);await choose(page,'For myself');await choose(page,'Open to either');await choose(page,'No fixed timeline');await choose(page,'Flexible');await choose(page,'Yes',false);
 await page.getByLabel('Trade brand',{exact:true}).fill('Omega');await page.getByLabel('Trade model',{exact:true}).fill('Speedmaster');await page.getByLabel('Trade condition',{exact:true}).selectOption('Good');await page.getByLabel('Trade presentation',{exact:true}).selectOption('Other / not sure');await next(page);await expect(page.getByRole('region',{name:'Private watch request'}).getByRole('alert')).toContainText('included');await page.getByLabel('What is included?',{exact:true}).fill('Box only');await next(page);
 await page.getByLabel('Full name',{exact:true}).fill('Test Client');await page.getByRole('textbox',{name:'Email',exact:true}).fill('test@example.com');await page.getByLabel('City / country',{exact:true}).fill('Miami');await choose(page,'WhatsApp',false);await next(page);await expect(page.getByRole('textbox',{name:'Phone',exact:true})).toHaveAttribute('aria-invalid','true');await page.getByRole('textbox',{name:'Phone',exact:true}).fill('+1 202 555 0100');await next(page);
 for(const theme of ['Light','Dark'] as const){await appearance(page,theme);expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);}
 await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Send private request'}).click();await expect(page.getByText('Demo complete. No request or email was sent.')).toBeVisible();
});
test('light and dark persist, no system option appears, and storage remains optional',async({page})=>{
 await page.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.includes('PrivateRequest'))throw new DOMException('Storage blocked','SecurityError');return original.call(this,key,value);};});
 await start(page);await expect(page.getByRole('switch',{name:'Sound',exact:true})).toHaveAttribute('aria-checked','false');await appearance(page,'Dark');await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content',await page.locator('html').evaluate(el=>getComputedStyle(el).getPropertyValue('--surface-page').trim()));await appearance(page,'Light');await expect(page.getByRole('radio',{name:'System appearance'})).toHaveCount(0);await page.emulateMedia({colorScheme:'dark'});await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 const begin=page.getByRole('button',{name:'Let’s get started'});if(await begin.isVisible())await begin.click();await expect(page.getByText('Draft saving is unavailable in this browser.',{exact:true})).toBeVisible();await choose(page,'Rolex');await expect(page.getByRole('heading',{name:'What are we looking for today?'})).toBeFocused();
});
test('saving locks competing edits',async({page})=>{
 let resolve!:()=>void;let sent!:()=>void;const arrived=new Promise<void>(r=>sent=r);const release=new Promise<void>(r=>resolve=r);await page.route('**/api/watch-request',async route=>{sent();await release;await route.fulfill({status:202,json:{status:'accepted',preview:true,requestId:'DEMO-LOCK'}});});
 await readyForReview(page);await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Send private request'}).click();await arrived;await expect(page.getByRole('button',{name:'Edit watch 1',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Edit contact details',exact:true})).toBeDisabled();await expect(page.getByRole('checkbox')).toBeDisabled();resolve();await expect(page.getByText('DEMO-LOCK',{exact:true})).toBeVisible();
});
test('Back cancels queued advancement, keyboard choices stay explorable and custom budget waits',async({page})=>{
 await start(page);await choose(page,'Rolex');await page.getByLabel('Model',{exact:true}).fill('Daytona');await next(page);await choose(page,'For myself');
 await page.evaluate(()=>{document.querySelector<HTMLButtonElement>('[role=radio][aria-label="Pre-owned"]')!.click();Array.from(document.querySelectorAll<HTMLButtonElement>('.form-nav button')).find(b=>b.textContent?.includes('Back'))!.click();});
 await page.waitForTimeout(400);await expect(page.getByRole('heading',{name:'Is it for something special?'})).toBeVisible();await choose(page,'For myself');await choose(page,'Pre-owned');await choose(page,'No fixed timeline');await choose(page,'Custom',false);await page.waitForTimeout(400);await expect(page.getByLabel('Up to (USD)',{exact:true})).toBeVisible();await page.getByLabel('Up to (USD)',{exact:true}).fill('25000');await next(page);await page.getByRole('button',{name:'← Back',exact:true}).click();
 await page.getByRole('radio',{name:'Custom',exact:true}).focus();await page.keyboard.press('ArrowLeft');await page.waitForTimeout(400);await expect(page.getByRole('radio',{name:'Flexible',exact:true})).toHaveAttribute('aria-checked','true');await expect(page.getByRole('heading',{name:'What range feels comfortable?'})).toBeVisible();await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:'Would you like to trade a watch?'})).toBeVisible();
});
test('sound plays real short buffers only after opt-in and stops when disabled',async({page})=>{
 await page.addInitScript(()=>{const state={starts:0,running:false};Object.assign(window,{__audioEvidence:state});const context=window.AudioContext;const create=context.prototype.createBufferSource;context.prototype.createBufferSource=function(){const source=create.call(this);const start=source.start.bind(source);source.start=(...args:Parameters<AudioBufferSourceNode['start']>)=>{state.starts++;state.running=this.state==='running';start(...args);};return source;};});
 await start(page);const sound=page.getByRole('switch',{name:'Sound',exact:true});await expect(sound).toHaveAttribute('aria-checked','false');await expect(page.getByRole('slider')).toHaveCount(0);await sound.click();await expect(sound).toHaveAttribute('aria-checked','true');await expect.poll(()=>page.evaluate(()=>(window as typeof window & {__audioEvidence:{starts:number}}).__audioEvidence.starts)).toBeGreaterThanOrEqual(3);
 await choose(page,'Rolex');await sound.click();await expect(sound).toHaveAttribute('aria-checked','false');const before=await page.evaluate(()=>(window as typeof window & {__audioEvidence:{starts:number}}).__audioEvidence.starts);await page.waitForTimeout(650);await page.getByLabel('Model',{exact:true}).fill('Daytona');await next(page);expect(await page.evaluate(()=>(window as typeof window & {__audioEvidence:{starts:number}}).__audioEvidence.starts)).toBe(before);
});
test('unavailable audio is reported without claiming sound is on',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(window,'AudioContext',{value:class{constructor(){throw new Error('Audio unavailable in test');}}}));await start(page);const sound=page.getByRole('switch',{name:'Sound',exact:true});await sound.click();await expect(sound).toHaveAttribute('aria-checked','false');await expect(page.getByRole('status')).toContainText('Sound could not start');
});

test('themed pickers show choices, selected models, manual entry and clear guidance',async({page})=>{
 await start(page);await choose(page,'Rolex');const model=page.getByRole('combobox',{name:'Model',exact:true});
 await page.getByRole('button',{name:'Submariner',exact:true}).click();await expect(page.getByRole('button',{name:'Submariner',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Show model suggestions',exact:true}).click();await expect(page.getByRole('option',{name:'Submariner',exact:true})).toHaveAttribute('aria-selected','true');await expect(page.getByRole('option',{name:'Daytona',exact:true})).toBeVisible();
 for(const theme of ['Light','Dark'] as const){await appearance(page,theme);await model.click();expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);}
 await page.getByRole('option',{name:'Daytona',exact:true}).click();await expect(model).toHaveValue('Daytona');await expect(page.getByRole('button',{name:'Daytona',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('button',{name:'Submariner',exact:true})).toHaveAttribute('aria-pressed','false');await expect(page.getByRole('button',{name:'Watch 1 · Rolex Daytona',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Show reference suggestions',exact:true}).click();await page.getByRole('option',{name:'126500LN',exact:true}).click();await expect(page.getByRole('combobox',{name:'Reference',exact:true})).toHaveValue('126500LN');
 await page.getByRole('button',{name:'Show year preference suggestions',exact:true}).click();await page.getByRole('option',{name:'Current production',exact:true}).click();await expect(page.getByRole('combobox',{name:'Year preference',exact:true})).toHaveValue('Current production');await page.getByRole('button',{name:'Show dial preference suggestions',exact:true}).click();await page.getByRole('option',{name:'Blue',exact:true}).click();await expect(page.getByRole('combobox',{name:'Dial preference',exact:true})).toHaveValue('Blue');
 await model.click();await model.press('ArrowDown');await model.press('Enter');await expect(model).toHaveValue('Submariner');await expect(page.getByRole('combobox',{name:'Reference',exact:true})).toHaveValue('');
 await model.click();await page.getByRole('option',{name:'Other / enter manually',exact:true}).click();await expect(model).toHaveValue('');await expect(model).toBeFocused();await model.fill('Vintage Explorer');await expect(page.getByText('No matching suggestions. You can type your own.',{exact:true})).toBeVisible();await model.press('Escape');await expect(page.getByRole('listbox')).toHaveCount(0);await expect(model).toHaveValue('Vintage Explorer');
 await page.getByRole('button',{name:'I’d like your guidance',exact:true}).click();await page.getByRole('button',{name:'Keep model open',exact:true}).click();await expect(page.getByText(/Model left open. Your concierge/)).toBeVisible();await expect(page.getByRole('button',{name:'Watch 1 · Rolex · Guidance',exact:true})).toBeVisible();
});
test('all homepage watch images decode successfully',async({page})=>{
 await page.goto('/');const images=page.locator('img');expect(await images.count()).toBeGreaterThanOrEqual(1);
 for(const img of await images.all()){await img.scrollIntoViewIfNeeded();await expect.poll(()=>img.evaluate(element=>(element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth>0)).toBe(true);await img.evaluate(async element=>{await (element as HTMLImageElement).decode();});expect(await img.evaluate(element=>(element as HTMLImageElement).naturalWidth>0 && (element as HTMLImageElement).naturalHeight>0)).toBe(true);}
});

test('focused introduction shows proof points and starts the request with one CTA',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await expect(page.getByRole('heading',{level:1})).toContainText('Together, let’s find');
 await expect(page.getByText('$100M+', {exact:true})).toBeVisible();
 await expect(page.getByText('24H', {exact:true})).toBeVisible();
 await expect(page.getByRole('radiogroup',{name:'Watch brand'})).toHaveCount(0);
 await page.getByRole('button',{name:'Let’s get started'}).click();
 await expect(page.getByRole('radiogroup',{name:'Watch brand'})).toBeVisible();
 await expect(page.locator('.concierge-directory')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Continue →',exact:true})).toBeEnabled();
 await expect(page.locator('.item-tabs')).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Which brand are we looking for?'})).toBeFocused();
 const header=await page.locator('.request-topbar').boundingBox();expect(header!.height).toBeLessThan(80);
 const choice=await page.getByRole('radio',{name:'Rolex',exact:true}).boundingBox();expect(choice!.y+choice!.height).toBeLessThan(844);
 await page.setViewportSize({width:320,height:568});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('.request-menu summary').click();await expect(page.getByRole('link',{name:'Our service',exact:true})).toBeVisible();
});

test('year ranges are clear, reversible and restored with the draft',async({page})=>{
 await start(page);await choose(page,'Rolex');await page.getByRole('button',{name:'Submariner',exact:true}).click();
 const year=page.getByRole('combobox',{name:'Year preference',exact:true});
 for(const value of [2024,2025,2026]){const chip=page.getByRole('button',{name:`${value} and newer`,exact:true});await chip.click();await expect(year).toHaveValue(`${value} and newer`);await expect(chip).toHaveAttribute('aria-pressed','true');}
 await expect(page.getByText('Saved in this tab.',{exact:true})).toBeVisible();await page.reload();await page.getByRole('button',{name:'Let’s get started',exact:true}).click();await expect(year).toHaveValue('2026 and newer');
 await page.getByRole('button',{name:'2026 and newer',exact:true}).click();await expect(year).toHaveValue('');
 await page.getByRole('button',{name:'Show year preference suggestions',exact:true}).click();await page.getByRole('option',{name:'2025 and newer',exact:true}).click();await expect(page.getByRole('button',{name:'2025 and newer',exact:true})).toHaveAttribute('aria-pressed','true');
 await year.fill('2021');await year.press('Escape');await expect(page.getByRole('button',{name:'2025 and newer',exact:true})).toHaveAttribute('aria-pressed','false');await expect(year).toHaveValue('2021');
});

test('step one is reachable from review without resetting entered details',async({page})=>{
 await readyForReview(page);await page.getByRole('button',{name:'Edit watch 1',exact:true}).click();
 await page.getByRole('button',{name:'← Step 1 · Brand',exact:true}).click();
 await expect(page.getByRole('radio',{name:'Rolex',exact:true})).toHaveAttribute('aria-checked','true');
 await next(page);await expect(page.getByLabel('Model',{exact:true})).toHaveValue('Daytona');await next(page);
 await expect(page.getByRole('radio',{name:'For myself',exact:true})).toHaveAttribute('aria-checked','true');
 await next(page);await next(page);await next(page);await next(page);await next(page);
 await expect(page.getByLabel('Full name',{exact:true})).toHaveValue('Test Client');
 await page.getByRole('button',{name:'← Step 1 · Brand',exact:true}).click();await expect(page.getByRole('radio',{name:'Rolex',exact:true})).toBeVisible();
});

test('watch cards stay side by side and the guide has one description field',async({page})=>{
 await page.setViewportSize({width:390,height:844});await start(page);await watch(page);
 await page.getByRole('button',{name:'Add another requested watch'}).click();await choose(page,'Omega');
 await page.getByLabel('Collection or model',{exact:true}).fill('Speedmaster');
 const first=page.getByRole('button',{name:'Watch 1 · Rolex Daytona',exact:true});const second=page.getByRole('button',{name:'Watch 2 · Omega Speedmaster',exact:true});
 await expect(second).toHaveAttribute('aria-pressed','true');await first.click();await expect(page.getByLabel('Model',{exact:true})).toHaveValue('Daytona');await second.click();await expect(page.getByLabel('Collection or model',{exact:true})).toHaveValue('Speedmaster');
 expect(await first.evaluate((element)=>Math.round(element.getBoundingClientRect().top))).toBe(await second.evaluate((element)=>Math.round(element.getBoundingClientRect().top)));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'I’d like your guidance',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog.locator('textarea')).toHaveCount(1);await expect(page.getByRole('button',{name:'Describe it to your guide'})).toHaveCount(0);
 await page.getByLabel('Your description',{exact:true}).fill('Omega Speedmaster black dial');await page.getByRole('button',{name:'Review suggestions'}).click();await expect(dialog.locator('textarea')).toHaveCount(1);await page.getByRole('button',{name:'Use these details'}).click();await expect(dialog).not.toBeVisible();
 for(const theme of ['Light','Dark'] as const){await appearance(page,theme);expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);}
});

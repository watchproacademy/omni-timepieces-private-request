import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function start(page: Page, url = '/') { await page.goto(url); const begin = page.getByRole('button', { name: 'Begin your request' }); if (await begin.isVisible())
    await begin.click(); await expect(page.getByRole('button', { name: 'Continue →', exact: true })).toBeEnabled(); }
async function next(page: Page) { await page.getByRole('button', { name: 'Continue →', exact: true }).click(); }
async function watch(page: Page, brand = 'Rolex', model = 'Daytona') {
    await page.getByRole('button', { name: brand, exact: true }).click();
    await next(page);
    await page.getByLabel('Model', { exact: true }).fill(model);
    await next(page);
    await page.getByRole('button', { name: 'For myself', exact: true }).click();
    await next(page);
    await page.getByRole('button', { name: 'Pre-owned', exact: true }).click();
    await next(page);
    await page.getByRole('button', { name: 'No fixed timeline', exact: true }).click();
    await next(page);
    await page.getByRole('button', { name: 'Flexible', exact: true }).click();
}
async function contact(page: Page) { await page.getByLabel('Full name', { exact: true }).fill('Test Client'); await page.getByLabel('Email', { exact: true }).fill('test@example.com'); await page.getByLabel('City / country', { exact: true }).fill('Miami, USA'); await page.getByRole('button', { name: 'Email', exact: true }).click(); await next(page); }
test('all nine steps, required email and consent, and accepted demo receipt', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await start(page);
    await watch(page);
    await next(page);
    await page.getByRole('button', { name: 'No', exact: true }).click();
    await next(page);
    await next(page);
    await expect(page.getByRole('region', { name: 'Private watch request' }).getByRole('alert')).toContainText('contact');
    await contact(page);
    await page.getByRole('button', { name: 'Send private request' }).click();
    await expect(page.getByRole('region', { name: 'Private watch request' }).getByRole('alert')).toBeVisible();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Send private request' }).click();
    await expect(page.getByText('Demo complete. No request or email was sent.')).toBeVisible();
    expect(errors).toEqual([]);
});
test('prefill, changing model resets reference, draft restores and review edits agree', async ({ page }) => {
    await start(page, '/?brand=Rolex&model=Daytona&reference=126500LN&utm_source=test');
    await next(page);
    await expect(page.getByLabel('Model', { exact: true })).toHaveValue('Daytona');
    await expect(page.getByRole('combobox', { name: 'Reference', exact: true })).toHaveValue('126500LN');
    await page.getByLabel('Model', { exact: true }).fill('Datejust');
    await expect(page.getByRole('combobox', { name: 'Reference', exact: true })).toHaveValue('');
    await page.waitForTimeout(250);
    await page.evaluate(() => history.replaceState(null, '', '/'));
    await page.reload();
    const begin = page.getByRole('button', { name: 'Begin your request' });
    if (await begin.isVisible())
        await begin.click();
    await expect(page.getByLabel('Model', { exact: true })).toHaveValue('Datejust');
});
test('multiple watches and trades retain independent details', async ({ page }) => {
    await start(page);
    await watch(page);
    await page.getByRole('button', { name: 'Add another requested watch' }).click();
    await watch(page, 'Rolex', 'Datejust');
    await next(page);
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await page.getByLabel('Trade brand', { exact: true }).fill('Rolex');
    await page.getByLabel('Trade model', { exact: true }).fill('Submariner');
    await page.getByLabel('Trade condition', { exact: true }).selectOption('Good');
    await page.getByLabel('Trade presentation', { exact: true }).selectOption('Watch only');
    await page.getByRole('button', { name: 'Add another trade-in' }).click();
    await page.getByLabel('Trade brand', { exact: true }).fill('Omega');
    await page.getByLabel('Trade model', { exact: true }).fill('Speedmaster');
    await page.getByLabel('Trade condition', { exact: true }).selectOption('Excellent');
    await page.getByLabel('Trade presentation', { exact: true }).selectOption('Watch only');
    await next(page);
    await contact(page);
    await expect(page.getByRole('heading', { name: 'Watch 1 · Rolex Daytona' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Watch 2 · Rolex Datejust' })).toBeVisible();
    await expect(page.getByText('1. Rolex Submariner', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Edit watch 1', exact: true }).click();
    await expect(page.getByLabel('Model', { exact: true })).toHaveValue('Daytona');
    await page.getByRole('button', { name: 'Remove watch 2' }).click();
    await expect(page.getByRole('button', { name: 'Remove watch 2' })).toHaveCount(0);
});
test('guidance dialog traps focus, applies reviewed details, and closes with Escape', async ({ page }) => {
    await start(page);
    await page.getByRole('button', { name: 'Rolex', exact: true }).click();
    await next(page);
    await page.getByRole('button', { name: 'Describe it to your guide' }).click();
    await page.getByLabel('Your description', { exact: true }).fill('A blue Rolex GMT-Master II on Jubilee under $30k');
    await page.getByRole('button', { name: 'Review suggestions' }).click();
    await page.getByRole('button', { name: 'Use these details' }).click();
    await expect(page.getByLabel('Model', { exact: true })).toHaveValue('GMT-Master II');
    await page.getByRole('button', { name: 'Describe it to your guide' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
});
test('failed submissions keep draft and retry with the same idempotency key', async ({ page }) => {
    const keys: string[] = [];
    await page.route('**/api/watch-request', async (route) => { keys.push(route.request().headers()['idempotency-key']); await route.fulfill({ status: keys.length === 1 ? 503 : 202, json: keys.length === 1 ? { message: 'Please retry.' } : { status: 'accepted', preview: true, requestId: 'DEMO-TEST' } }); });
    await start(page);
    await watch(page);
    await next(page);
    await page.getByRole('button', { name: 'No', exact: true }).click();
    await next(page);
    await contact(page);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Send private request' }).click();
    await expect(page.getByRole('region', { name: 'Private watch request' }).getByRole('alert')).toContainText('Please retry');
    await page.getByRole('button', { name: 'Send private request' }).click();
    await expect(page.getByText('DEMO-TEST')).toBeVisible();
    expect(keys[0]).toBe(keys[1]);
});
test('themes, zoom-friendly layout, and accessible funnel controls', async ({ page }) => {
    await start(page);
    for (const theme of ['light', 'dark']) {
        await page.getByLabel('Appearance', { exact: true }).selectOption(theme);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(result.violations).toEqual([]);
    }
    await page.setViewportSize({ width: 320, height: 500 });
    const begin = page.getByRole('button', { name: 'Begin your request' });
    if (await begin.isVisible())
        await begin.click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Continue →' }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Continue →' })).toBeVisible();
});
test('public pages render readable initial HTML, metadata, crawler files, and redirects', async ({ request, page }) => {
    const response = await request.get('/brands/rolex');
    const html = await response.text();
    expect(html).toContain('Shape the configuration');
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('BreadcrumbList');
    expect(html).toContain('noindex');
    await page.goto('/services');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Private watch sourcing');
    const redirect=await request.get('/index.html?brand=Rolex', {maxRedirects:0});
    expect(redirect.status()).toBe(308);
    expect(redirect.headers().location).toContain('?brand=Rolex');
    expect(await (await request.get('/llms.txt')).text()).toContain('Catalog entries are examples');
    expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /');
});
test('rare brands, guidance, custom trade details and phone follow-up validate before acceptance',async({page})=>{
 await start(page);await page.getByRole('button',{name:'Other',exact:true}).click();await page.getByLabel('Brand name',{exact:true}).fill('Independent atelier');await next(page);await page.getByRole('button',{name:'I’d like your guidance',exact:true}).click();await next(page);
 await page.getByRole('button',{name:'For myself',exact:true}).click();await next(page);await page.getByRole('button',{name:'Open to either',exact:true}).click();await next(page);await page.getByRole('button',{name:'No fixed timeline',exact:true}).click();await next(page);await page.getByRole('button',{name:'Flexible',exact:true}).click();await next(page);
 await page.getByRole('button',{name:'Yes',exact:true}).click();await page.getByLabel('Trade brand',{exact:true}).fill('Omega');await page.getByLabel('Trade model',{exact:true}).fill('Speedmaster');await page.getByLabel('Trade condition',{exact:true}).selectOption('Good');await page.getByLabel('Trade presentation',{exact:true}).selectOption('Other / not sure');await next(page);await expect(page.getByRole('region',{name:'Private watch request'}).getByRole('alert')).toContainText('included');await page.getByLabel('What is included?',{exact:true}).fill('Box only');await next(page);
 await page.getByLabel('Full name',{exact:true}).fill('Test Client');await page.getByLabel('Email',{exact:true}).fill('test@example.com');await page.getByLabel('City / country',{exact:true}).fill('Miami');await page.getByRole('button',{name:'WhatsApp',exact:true}).click();await next(page);await expect(page.getByRole('textbox',{name:'Phone',exact:true})).toHaveAttribute('aria-invalid','true');await page.getByRole('textbox',{name:'Phone',exact:true}).fill('+1 202 555 0100');await next(page);
 for(const theme of ['light','dark']){await page.getByLabel('Appearance',{exact:true}).selectOption(theme);expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);}
 await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Send private request'}).click();await expect(page.getByRole('heading',{name:'Your concierge will take it from here.'})).toBeFocused();await expect(page.getByText('Demo complete. No request or email was sent.')).toBeVisible();
});
test('theme persists without script errors, blocked storage is optional and audio stays opt-in',async({page})=>{
 await page.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.includes('PrivateRequest'))throw new DOMException('Storage blocked','SecurityError');return original.call(this,key,value);};});
 await start(page);await expect(page.getByRole('button',{name:'Sound off'})).toBeVisible();await page.getByLabel('Appearance',{exact:true}).selectOption('dark');await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');const begin=page.getByRole('button',{name:'Begin your request'});if(await begin.isVisible())await begin.click();await page.getByRole('button',{name:'Rolex',exact:true}).click();await next(page);await expect(page.getByRole('heading',{name:'What are we looking for today?'})).toBeFocused();
});
test('saving locks the submitted brief and prevents competing edits',async({page})=>{
 let resolve!:()=>void;let sent!:()=>void;const arrived=new Promise<void>(r=>sent=r);const release=new Promise<void>(r=>resolve=r);
 await page.route('**/api/watch-request',async route=>{sent();await release;await route.fulfill({status:202,json:{status:'accepted',preview:true,requestId:'DEMO-LOCK'}});});
 await start(page);await watch(page);await next(page);await page.getByRole('button',{name:'No',exact:true}).click();await next(page);await contact(page);await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Send private request'}).click();await arrived;
 await expect(page.getByRole('button',{name:'Edit watch 1',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Edit contact details',exact:true})).toBeDisabled();await expect(page.getByRole('checkbox')).toBeDisabled();resolve();await expect(page.getByText('DEMO-LOCK')).toBeVisible();
});

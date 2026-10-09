import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('intro copy is server rendered and accessible in both themes', async ({page, request}) => {
    const html = await (await request.get('/')).text();
    expect(html).toContain('$100M+');
    expect(html).toContain('Most watches located');
    await page.setViewportSize({width:390,height:844});
    await page.goto('/');
    for (const theme of ['Light', 'Dark']) {
        await page.locator('.appearance-menu summary').click();
        await expect(page.getByRole('radio',{name:'System appearance'})).toHaveCount(0);
        await page.getByRole('radio',{name:`${theme} appearance`,exact:true}).click();
        await page.locator('.appearance-menu summary').click();
        expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
    }
    await page.setViewportSize({width:320,height:568});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.getByRole('button',{name:'Let’s get started'}).click();
    await expect(page.getByRole('heading',{name:'Which brand are we looking for?'})).toBeFocused();
});

test('rapid sound toggles preserve the latest choice and hidden tabs stop the clock', async ({page}) => {
    await page.addInitScript(() => {
        const evidence = { starts: 0 };
        Object.assign(window, { __clockEvidence: evidence });
        const resume = AudioContext.prototype.resume;
        AudioContext.prototype.resume = async function () { await resume.call(this); await new Promise(resolve => setTimeout(resolve, 300)); };
        const create = AudioContext.prototype.createBufferSource;
        AudioContext.prototype.createBufferSource = function () {
            const source = create.call(this); const start = source.start.bind(source);
            source.start = (...args: Parameters<AudioBufferSourceNode['start']>) => { evidence.starts++; start(...args); };
            return source;
        };
    });
    await page.goto('/');
    const sound = page.getByRole('switch',{name:'Sound',exact:true});
    await sound.click(); await expect(sound).toHaveAttribute('aria-busy','true');
    await sound.click(); await sound.click();
    await expect(sound).toHaveAttribute('aria-checked','true');
    await expect.poll(()=>page.evaluate(()=>(window as typeof window & {__clockEvidence:{starts:number}}).__clockEvidence.starts)).toBeGreaterThanOrEqual(3);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    await expect(sound).toHaveAttribute('aria-checked','false');
    const stopped = await page.evaluate(()=>(window as typeof window & {__clockEvidence:{starts:number}}).__clockEvidence.starts);
    await page.waitForTimeout(650);
    expect(await page.evaluate(()=>(window as typeof window & {__clockEvidence:{starts:number}}).__clockEvidence.starts)).toBe(stopped);
});

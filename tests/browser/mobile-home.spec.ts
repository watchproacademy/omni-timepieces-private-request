import {test, expect} from '@playwright/test';

test('the logo opens the intro and preserves a request even without draft storage', async ({page}) => {
    await page.addInitScript(() => {Storage.prototype.setItem = () => {throw new Error('Storage unavailable');};});
    await page.goto('/');
    await page.getByRole('button',{name:'Let’s get started',exact:true}).click();
    await page.getByRole('radio',{name:'Rolex',exact:true}).click();
    await page.getByLabel('Model',{exact:true}).fill('Daytona');
    await page.getByRole('link',{name:'Omni Timepieces — private request home'}).click();
    await expect(page.getByRole('heading',{name:'Together, let’s find your next timepiece.'})).toBeFocused();
    await expect(page.getByLabel('Model',{exact:true})).not.toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole('button',{name:'Continue your request',exact:true}).click();
    await expect(page.getByLabel('Model',{exact:true})).toHaveValue('Daytona');
    await expect(page.getByRole('heading',{name:'What are we looking for today?'})).toBeFocused();
    await expect(page.locator('.request-footer > a')).toHaveAttribute('href','https://omnitimepieces.com');
});

test('intro fills tall mobile viewports and small screens can scroll without clipping', async ({page}) => {
    await page.setViewportSize({width:390,height:844});
    await page.goto('/');
    const measure = () => page.evaluate(() => ({
        shell: document.querySelector('.request-shell')!.getBoundingClientRect().height,
        footer: document.querySelector('.request-footer')!.getBoundingClientRect().bottom,
        height: innerHeight, width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    }));
    for (const height of [844,932,740]) {
        await page.setViewportSize({width:390,height});
        await expect.poll(async () => (await measure()).shell).toBeGreaterThanOrEqual(height);
        const bounds = await measure();
        expect(bounds.footer).toBeGreaterThan(height-40);
        expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.width);
    }
    await page.setViewportSize({width:320,height:568});
    await page.getByRole('button',{name:'Let’s get started',exact:true}).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button',{name:'Let’s get started',exact:true})).toBeInViewport();
    expect((await measure()).scrollWidth).toBeLessThanOrEqual(320);
});

test('sound requests a playback session only after opt-in and releases it on stop', async ({page}) => {
    await page.addInitScript(() => {
        Object.defineProperty(navigator,'audioSession',{configurable:true,value:{type:'auto'}});
        const createGain = AudioContext.prototype.createGain;
        AudioContext.prototype.createGain = function () {
            Object.assign(window,{__soundDevice:this});
            return createGain.call(this);
        };
    });
    const session = () => page.evaluate(() => (navigator as Navigator & {audioSession:{type:string}}).audioSession.type);
    await page.goto('/');
    const sound = page.getByRole('switch',{name:'Sound',exact:true});
    expect(await session()).toBe('auto');
    await sound.click();
    await expect(sound).toHaveAttribute('aria-checked','true');
    expect(await session()).toBe('playback');
    await page.evaluate(() => (window as typeof window & {__soundDevice:AudioContext}).__soundDevice.suspend());
    await expect(sound).toHaveAttribute('aria-checked','false');
    expect(await session()).toBe('auto');
    await sound.click();
    await expect(sound).toHaveAttribute('aria-checked','true');
    await sound.click();
    await expect(sound).toHaveAttribute('aria-checked','false');
    expect(await session()).toBe('auto');
});

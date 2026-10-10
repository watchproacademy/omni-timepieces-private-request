import { test, expect } from '@playwright/test';

test('mechanical contacts stay quiet and evenly timed across toggles and navigation', async ({ page }) => {
    await page.addInitScript(() => {
        const evidence = { times: [] as number[], peaks: [] as number[], durations: [] as number[], contexts: 0, stopped: 0 };
        Object.assign(window, { __watchAudio: evidence });
        const createGain = AudioContext.prototype.createGain;
        AudioContext.prototype.createGain = function () { evidence.contexts++; return createGain.call(this); };
        const create = AudioContext.prototype.createBufferSource;
        AudioContext.prototype.createBufferSource = function () {
            const source = create.call(this);
            const start = source.start.bind(source), stop = source.stop.bind(source);
            source.start = (...args: Parameters<AudioBufferSourceNode['start']>) => {
                evidence.times.push(args[0] ?? this.currentTime);
                const samples = source.buffer!.getChannelData(0);
                evidence.peaks.push(samples.reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0));
                evidence.durations.push(source.buffer!.duration);
                start(...args);
            };
            source.stop = (...args: Parameters<AudioBufferSourceNode['stop']>) => { evidence.stopped++; stop(...args); };
            return source;
        };
    });
    const read = () => page.evaluate(() => (window as typeof window & { __watchAudio: { times: number[]; peaks: number[]; durations: number[]; contexts: number; stopped: number } }).__watchAudio);
    await page.goto('/');
    const sound = page.getByRole('switch', { name: 'Sound', exact: true });
    expect((await read()).times).toEqual([]);
    await sound.click();
    await expect(sound).toHaveAttribute('aria-checked', 'true');
    await expect.poll(async () => (await read()).times.length).toBeGreaterThanOrEqual(10);
    const playing = await read();
    for (let i = 1; i < playing.times.length; i++) expect(playing.times[i] - playing.times[i - 1]).toBeCloseTo(.125, 5);
    expect(playing.peaks.every(peak => peak > .01 && peak < .8)).toBe(true);
    expect(playing.durations.every(duration => duration >= .032 && duration < .033)).toBe(true);
    // Root provider survives client navigation; it must not start another loop.
    await page.locator('.request-menu summary').click();
    await page.getByRole('link', { name: 'Our service', exact: true }).click();
    await expect(page).toHaveURL(/\/services$/);
    await expect(sound).toHaveAttribute('aria-checked', 'true');
    expect((await read()).contexts).toBe(1);
    for (let i = 0; i < 3; i++) {
        await sound.click(); await expect(sound).toHaveAttribute('aria-checked', 'false');
        const off = (await read()).times.length;
        await page.waitForTimeout(200);
        expect((await read()).times.length).toBe(off);
        await sound.click(); await expect(sound).toHaveAttribute('aria-checked', 'true');
        await expect.poll(async () => (await read()).times.length).toBeGreaterThan(off);
    }
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await expect(sound).toHaveAttribute('aria-checked', 'false');
    const off = (await read()).times.length;
    await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
    await page.waitForTimeout(250);
    expect((await read()).times.length).toBe(off);
    await sound.click(); await expect(sound).toHaveAttribute('aria-checked', 'true');
    await sound.click(); await expect(sound).toHaveAttribute('aria-checked', 'false');
    expect((await read()).stopped).toBeGreaterThan(0);
    await page.reload();
    await expect(sound).toHaveAttribute('aria-checked', 'false');
    expect((await read()).times).toEqual([]);
});

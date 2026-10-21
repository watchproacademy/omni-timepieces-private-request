import {test, expect, type Page} from '@playwright/test';
import {initialState, blankTrade} from '../../src/lib/state';
import {config, steps} from '../../src/lib/config';

async function openStep(page: Page, step: string) {
    const draft = initialState();
    draft.step = steps.findIndex(item => item.id === step);
    Object.assign(draft.watches[0], {brand:'Rolex', model:'Daytona', occasion:'For myself', condition:'Pre-owned', timeline:'No fixed timeline', budget:'Flexible'});
    draft.tradeIn = 'Yes';
    draft.trades = [{...blankTrade('trade'), brand:'Omega', model:'Speedmaster', condition:'Good', set:'Watch only'}];
    draft.activeTradeId = 'trade';
    await page.addInitScript(({key, draft}) => sessionStorage.setItem(key, JSON.stringify({version:4, state:draft})), {key:config.draftKey, draft});
    // These checks never send a lead, notification, or other API request.
    await page.route('**/api/**', route => route.abort());
    await page.goto('/');
    await page.getByRole('button', {name:'Let’s get started', exact:true}).click();
}

test('trade accepts an older manual year and an explicit Unknown with no purchase choices', async ({page}) => {
    await openStep(page, 'trade');
    const year = page.getByRole('combobox', {name:'Trade year', exact:true});
    await expect(year).toHaveValue('');
    await page.getByRole('button', {name:'Show trade year suggestions', exact:true}).click();
    await expect(page.getByRole('option', {name:'Current production', exact:true})).toHaveCount(0);
    await expect(page.getByRole('option', {name:'Any year', exact:true})).toHaveCount(0);
    await page.getByRole('option', {name:'Unknown', exact:true}).click();
    await expect(year).toHaveValue('Unknown');
    await year.fill('1890');
    await page.getByRole('button', {name:'Continue →', exact:true}).click();
    await expect(page.getByLabel('Phone', {exact:true})).toBeVisible();
    await page.getByRole('button', {name:'← Back', exact:true}).click();
    await expect(year).toHaveValue('1890');
    await page.getByRole('button', {name:'Show trade year suggestions', exact:true}).click();
    await page.getByRole('option', {name:'Unknown', exact:true}).click();
    await page.getByRole('button', {name:'Continue →', exact:true}).click();
    await expect(page.getByLabel('Phone', {exact:true})).toBeVisible();
});

test('phone is empty with neutral guidance and retains international input', async ({page}) => {
    await openStep(page, 'contact');
    const phone = page.getByLabel('Phone', {exact:true});
    await expect(phone).toHaveValue('');
    await expect(phone).toHaveAttribute('placeholder', 'Phone number with country code');
    await expect(phone).toHaveAttribute('autocomplete', 'tel');
    await expect(phone).toHaveAttribute('type', 'tel');
    for (const value of ['+1 202 555 0100', '+971 50 123 4567', '+81 3-1234-5678']) {
        await phone.fill(value);
        await phone.blur();
        await expect(phone).toHaveValue(value);
    }
});

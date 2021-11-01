import { test } from '@playwright/test';
import { assert } from '../../assert';
import { Auth } from '../../screens/auth';
import { WalletsScreen } from '../../screens/wallets';
import { data } from '../../test-data';
import { setupPage } from '../../pw-helpers/setup-page';
import { getWalletURL } from '../../config';

let walletsScreen: WalletsScreen;
let auth: Auth;

test.describe('Validation >', () => {
  test.beforeEach(async ({ page }) => {
    setupPage(page);
    auth = new Auth(page);
    walletsScreen = new WalletsScreen(page);
    await page.goto(getWalletURL(), { waitUntil: 'networkidle' });
    await auth.loginByRestoringSeed(data.wallets.txSender.seed);
    await walletsScreen.selectWallet('Velas Native');
  });

  test('VLX Native: Show Invalid Address error', async ({ page }) => {
    await page.click('#wallets-send');
    await page.type('#send-recipient', 'invalid');
    await page.waitForSelector('text=/(?=.*not)(?=.*valid)(?=.*address)/i');

    await page.fill('#send-recipient', 'BfGhk12f68mBGz5hZqm4bDSDaTBFfNZmegppzVcVdGDW');
    await walletsScreen.waitForSelectorDisappears('text=/(?=.*not)(?=.*valid)(?=.*address)/i', {timeout: 3000});
    assert.isFalse(await page.isVisible('text=/(?=.*not)(?=.*valid)(?=.*address)/i'));
  });

  test('VLX Native: Show Not Enough Funds error', async ({ page }) => {
    await page.click('#wallets-send');
    await page.fill('#send-recipient', 'BfGhk12f68mBGz5hZqm4bDSDaTBFfNZmegppzVcVdGDW');

    await page.fill('div.amount-field .textfield[label="Send"]', '99999999');
    // if send button is disabled, we know balance check has been finished
    await page.waitForSelector('#send-confirm[disabled]');
    await page.waitForSelector('text=/not enough/i');

    // need to clear the field because actions are too fast and test fails
    await page.fill('div.amount-field .textfield[label="Send"]', '');
    
    await page.click('#send-max');
    await walletsScreen.waitForSelectorDisappears('text=/not enough/i', {timeout: 3000});
  });
});

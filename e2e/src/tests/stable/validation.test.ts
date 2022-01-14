import { test } from '@playwright/test';
import { assert } from '../../assert';
import { Auth } from '../../screens/auth';
import { WalletsScreen } from '../../screens/wallets';
import { data } from '../../test-data';
import { setupPage } from '../../pw-helpers/setup-page';
import { walletURL } from '../../config';

let walletsScreen: WalletsScreen;
let auth: Auth;

test.describe.parallel('Validation', () => {
  test.beforeEach(async ({ page }) => {
    setupPage(page);
    auth = new Auth(page);
    walletsScreen = new WalletsScreen(page);
    await page.goto(walletURL, { waitUntil: 'networkidle' });
    await auth.loginByRestoringSeed(data.wallets.txSender.seed);
    await walletsScreen.selectWallet('token-vlx_native');
  });

  test('VLX Native: Show Invalid Address error', async ({ page }) => {
    await walletsScreen.clickSendButton();
    await page.type('#send-recipient', 'invalid');
    await page.waitForSelector('text=/(?=.*not)(?=.*valid)(?=.*address)/i');

    await page.fill('#send-recipient', 'BfGhk12f68mBGz5hZqm4bDSDaTBFfNZmegppzVcVdGDW');
    await walletsScreen.waitForSelectorDisappears('text=/(?=.*not)(?=.*valid)(?=.*address)/i');
    assert.isFalse(await page.isVisible('text=/(?=.*not)(?=.*valid)(?=.*address)/i'));
  });

  test('VLX Native: Show Not Enough Funds error', async ({ page }) => {
    await walletsScreen.selectWallet('token-vlx_native')
    await walletsScreen.clickSendButton();
    await page.fill('#send-recipient', 'BfGhk12f68mBGz5hZqm4bDSDaTBFfNZmegppzVcVdGDW');
    await page.fill('div.amount-field .textfield[label="Send"]', '99999999');

    try {
      await page.waitForSelector('text=/not enough/i');
    } catch {
      await page.click('#send-confirm');
      await page.waitForSelector('text=/not enough/i');
    }

    // need to clear the field because actions are too fast and test fails
    await page.fill('div.amount-field .textfield[label="Send"]', '');
    
    await page.click('#send-max');
    await walletsScreen.waitForSelectorDisappears('text=/not enough/i');
  });
});

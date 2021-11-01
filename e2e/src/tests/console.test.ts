import { test } from '@playwright/test';
import { assert } from '../assert';
import { getWalletURL } from '../config';
import { setupPage } from '../pw-helpers/setup-page';
import { WalletsScreen } from '../screens/wallets';
import { Auth } from '../screens/auth';
import { data } from '../test-data';

let walletsScreen: WalletsScreen;
let auth: Auth;

test.describe(' > ', () => {
  test.beforeEach(async ({ page }) => {
    setupPage(page);
    walletsScreen = new WalletsScreen(page);
    auth = new Auth(page);
    await page.goto(getWalletURL({ network: 'mainnet' }));
    await auth.loginByRestoringSeed(data.wallets.login.seed);
  });

  test('Check console for errors', async ({ page }) => {
    const errorLog: (string | Error)[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorLog.push(msg.text())
      }
    });

    page.on('pageerror', exception => {
      errorLog.push(exception);
    });

    await walletsScreen.waitForWalletsDataLoaded();
    await walletsScreen.addWalletsPopup.open();

    let hiddenTokenElements = await page.$$('.manage-account .settings .list .item');

    while (hiddenTokenElements.length !== 0) {
      await page.click('.list .item button');
      await walletsScreen.waitForWalletsDataLoaded();
      await walletsScreen.addWalletsPopup.open();
      hiddenTokenElements = await page.$$('.manage-account .settings .list .item');
    }
    await page.click('.manage-account .closed');
    await walletsScreen.waitForWalletsDataLoaded();

    assert.lengthOf(errorLog, 0, `Following console errors have been found:\n${errorLog.join('\n')}\n`);
  });
});

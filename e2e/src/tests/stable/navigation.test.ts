import { test } from '@playwright/test';
import { assert } from '../../assert';
import { walletURL } from '../../config';
import { setupPage } from '../../pw-helpers/setup-page';
import { Auth } from '../../screens/auth';
import { WalletsScreen } from '../../screens/wallets';
import { data } from '../../test-data';

let walletsScreen: WalletsScreen;
let auth: Auth;

test.describe.parallel('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    setupPage(page);
    walletsScreen = new WalletsScreen(page);
    auth = new Auth(page);
    await page.goto(walletURL, { waitUntil: 'networkidle' });
    await auth.loginByRestoringSeed(data.wallets.login.seed);
  });

  test('Navigate with back button in header', async ({ page }) => {
    await walletsScreen.waitForWalletsDataLoaded();

    const screens = ['settings', 'search', 'staking', 'swap', 'send'];

    for (let i = 0; i < screens.length; i++) {
      const screen = screens[i];

      // check that navigation doesn't get broken by locking screen
      
      await page.click('.menu-item.bottom');
      await auth.pinForLoggedOutAcc.typeAndConfirm('111222');
      assert.isTrue(await auth.isLoggedIn());

      switch (screen) {
        case 'settings':
          await walletsScreen.openMenu('settings');
          await page.waitForSelector('.active-network');
          break;

        case 'search':
          await walletsScreen.openMenu('wallets');
          await walletsScreen.openMenu('search');
          await page.waitForSelector('[placeholder="dapps"]');
          break;

        case 'staking':
          await walletsScreen.openMenu('wallets');
          await walletsScreen.openMenu('staking');
          await page.waitForSelector('.create-staking-account');
          break;

        case 'swap':
          await walletsScreen.openMenu('wallets');
          await page.waitForSelector('.with-swap #wallet-swap', { timeout: 20000, state: 'visible' });
          await page.click('.with-swap #wallet-swap');
          await page.waitForSelector('.network-slider');
          break;

        case 'send':
          await walletsScreen.openMenu('wallets');
          await page.click('#wallets-send');
          await page.waitForSelector('#send-recipient');
          assert.isFalse(await page.isVisible('.network-slider'));
          break;
      }
      await page.click('.close');
      await walletsScreen.waitForWalletsDataLoaded();
      assert.isTrue(await page.isVisible('.big.wallet'));
    }
  });

  test('Redirects to support page from menu', async ({ page, context }) => {
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('#menu-support'),
    ]);

    await newPage.waitForLoadState();
    assert.isTrue(newPage.url().includes('https://support.velas.com'));
  });
});

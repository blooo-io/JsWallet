import { test } from '@playwright/test';
import { assert } from '../../assert';
import { walletURL } from '../../config';
import { setupPage } from '../../pw-helpers/setup-page';
import { Auth, Language } from '../../screens/auth';
import { WalletsScreen } from '../../screens/wallets';
import { data } from '../../test-data';
import { log } from '../../tools/logger';

let walletsScreen: WalletsScreen;
let auth: Auth;

test.describe.parallel('Settings', () => {
  test.beforeEach(async ({ page }) => {
    setupPage(page);
    walletsScreen = new WalletsScreen(page);
    auth = new Auth(page);
    await page.goto(walletURL, { waitUntil: 'networkidle' });
    await auth.loginByRestoringSeed(data.wallets.login.seed);
  });

  test('Copy private key', async ({ context, page }) => {
    // arrange
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    // clear clipboard
    await page.evaluate(async () => await navigator.clipboard.writeText(''));

    await walletsScreen.openMenu('settings');
    await page.click('" Copy"');
    await page.type('[type="password"]', '111222');
    await walletsScreen.confirmPrompt();
    await page.click('.tokens-drop span:text(" Velas Native")');

    await page.waitForSelector('" Copied to Clipboard!"');

    const copiedKey = await page.evaluate(async () => await navigator.clipboard.readText());
    log.info(copiedKey);
    assert.equal(copiedKey, 'WnexSzUPFb258nLxGC1jiCShUZC1DbTpaRC2kizKxnpKNuvsqAhegBUCVgoULDxog19CjxfYaijS5Cpe78EFKqQ');
  });

  test('Switch account index', async ({ page }) => {
    await walletsScreen.waitForWalletsDataLoaded();
    await walletsScreen.openMenu('settings');
    await page.click('.button.right');
    await page.waitForSelector('.amount:not(.placeholder)');

    await walletsScreen.openMenu('wallets');
    await walletsScreen.selectWallet('token-vlx_native');

    assert.equal(await walletsScreen.getWalletAddress(), 'BfGhk12f68mBGz5hZqm4bDSDaTBFfNZmegppzVcVdGDW', 'Account 2 address on UI does not equal expected');
  });

  test('Enable/Disable testnet', async ({ page }) => {
    await walletsScreen.waitForWalletsDataLoaded();

    await walletsScreen.openMenu('settings');
    await page.click('.active-network');
    assert.isFalse(await page.isVisible('#menu-testnet'));
    
    await walletsScreen.openMenu('wallets');
    await walletsScreen.selectWallet('token-btc');
    assert.equal(await walletsScreen.getWalletAddress(), '1PV8RPEL8kNBnQytq2881TE3bSZJbJazDw', 'Mainnet BTC address on UI does not equal expected');
    
    await walletsScreen.openMenu('settings');
    await page.click('.active-network');
    assert.isTrue(await page.isVisible('#menu-testnet'));
    
    
    await walletsScreen.openMenu('wallets');
    await walletsScreen.selectWallet('token-btc');
    assert.equal(await walletsScreen.getWalletAddress(), 'n415iSKJwmoSZXTWYb6VqNSNTSA1YMwL8U', 'Testnet BTC address on UI does not equal expected');
  });

  test('Change language setting', async ({ page }) => {
    await walletsScreen.openMenu('settings');

    const headerTexts = {
      fr: ['Gérer le Compte', 'Français'],
      en: ['Manage Account', 'English'],
      kr: ['계정 관리', '한국어'],
      cn: ['管理帐户', '中文語言'],
      // in:
      es: ['Administrar Cuenta', 'Español'],
      ua: ['Управління аккаунтом', 'Українська'],
      ru: ['Управлять аккаунтом', 'Русский'],
      ar: ['إدارة الحساب', 'عربى'],
      // id:
      // ph:
      // yr:
      // vn:
    };

    const languages = Object.keys(headerTexts) as Language[];

    for (let i = 0; i < languages.length; i++) {
      const language = languages[i];
      log.info(language);
      // click languages button, change after devs add missing IDs to settings page
      await page.click('#switch-language .btn');

      const fullLanguageName = headerTexts[language][1];
      await page.click(`.lang-item:has-text("${fullLanguageName}")`);
      const actualHeaderText = (await page.textContent('.header'))?.trim();
      assert.equal(actualHeaderText, headerTexts[language][0], `${language} language on UI does not equal chosen language`);
    }
  });
});

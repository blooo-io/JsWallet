import { test } from '@playwright/test';
import { velasNative } from '@velas/velas-chain-test-wrapper';
import { assert } from '../../assert';
import { getWalletURL } from '../../config';
import { setupPage } from '../../pw-helpers/setup-page';
import { Auth } from '../../screens/auth';
import { Currency, WalletsScreen } from '../../screens/wallets';
import { data } from '../../test-data';

let auth: Auth;
let walletsScreen: WalletsScreen;

test.describe('Wallets screen >', () => {
  test.beforeEach(async ({ page }) => {
    setupPage(page);
    auth = new Auth(page);
    walletsScreen = new WalletsScreen(page);
    await page.goto(getWalletURL());
  });

  test.describe('Transactions >', () => {
    test('Transactions list is displayed', async ({ page }) => {
      // arrange
      await auth.loginByRestoringSeed(data.wallets.fundsReceiver.seed);

      await walletsScreen.selectWallet('Velas Native');
      await page.waitForSelector('.history-area div[datatesting="transaction"]', { timeout: 20000 });
      const transactions = await page.$$('.history-area div[datatesting="transaction"]');
      assert.isAbove(transactions.length, 10, 'Amount of transactions in the list is less than 10');

      const senderAddressSelector = `.history-area div[datatesting="transaction"] .address-holder a[href="https://native.velas.com/address/${data.wallets.txSender.address}?cluster=testnet"]`;
      assert.ok(await page.waitForSelector(senderAddressSelector));
    });
  });

  test.describe(' > ', () => {
    test.beforeEach(async () => {
      await auth.loginByRestoringSeed(data.wallets.login.seed);
      await walletsScreen.waitForWalletsDataLoaded();
    });

    test('Lock and unlock', async ({ page }) => {
      await page.click('.menu-item.bottom');
      assert.isTrue(await page.isVisible('input[type="password"]'));
      assert.isFalse(await page.isVisible('.menu-item.bottom'));

      await auth.pinForLoggedOutAcc.typeAndConfirm('111222');
      assert.isTrue(await auth.isLoggedIn());
    });

    test('Add and hide litecoin wallet', async () => {
      // add litecoin
      await walletsScreen.addWalletsPopup.open();
      await walletsScreen.addWalletsPopup.add('Litecoin');
      await walletsScreen.selectWallet('Litecoin');
      assert.isTrue(await walletsScreen.isWalletInWalletsList('Litecoin'));

      // remove litecoin
      await walletsScreen.hideWallet();
      assert.isFalse(await walletsScreen.isWalletInWalletsList('Litecoin'));
    });

    test('Switch account', async ({ page }) => {
      await walletsScreen.selectWallet('Velas Native')
      await page.click('.switch-account');
      await page.click('" Account 2"');
      assert.equal(await walletsScreen.getWalletAddress(), 'BfGhk12f68mBGz5hZqm4bDSDaTBFfNZmegppzVcVdGDW', 'Account 2 address on UI does not equal expected');
    });

    test('Show QR', async ({ page }) => {
      await page.hover('.wallet-detailed .address-holder .copy');
      await page.waitForSelector('.qrcode');
    });

    test('Copy wallet address from "Receive" page', async ({ context, page }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      // clear clipboard
      await page.evaluate(async () => await navigator.clipboard.writeText(''));

      await walletsScreen.selectWallet('Velas Native');
      await page.click('#wallets-receive');
      await page.waitForSelector('.ill-qr img');
      // qr code is displayed
      assert.isTrue(await page.isVisible('.receive-body canvas'));

      // copy to clipboard
      await page.click('.address-holder .copy');
      const copiedText = await page.evaluate(async () => await navigator.clipboard.readText());
      assert.equal(copiedText, 'G3N4212jLtDNCkfuWuUHsyG2aiwMWQLkeKDETZbo4KG');

      // back to wallets list
      await page.click('" Cancel"');
      await walletsScreen.waitForWalletsDataLoaded();
    });
  });

  test.describe('Balance >', () => {
    test.beforeEach(async () => {
      await auth.loginByRestoringSeed(data.wallets.withFunds.seed);
      await walletsScreen.waitForWalletsDataLoaded();
    });

    // extract "VLX Native balance update" to separate test
    test('Check VLX Legacy, VLX Native and Bitcoin balances', async () => {
      const balances = await walletsScreen.getWalletsBalances();

      const wallets = Object.keys(balances) as Currency[];

      for (let i = 0; i < wallets.length; i++) {
        const currency = wallets[i];
        const VLXNativeBalanceOnBlockchain = (await velasNative.getBalance(data.wallets.withFunds.address)).VLX;
        const balanceUpdateAmount = 0.001;
        const amountOfTokens = balances[currency];

        // if no balance – skip currency
        if (amountOfTokens === null) continue;

        switch (wallets[i]) {
          case 'Velas':
            assert.equal(amountOfTokens, '0.999958');
            break;
          case 'Velas Native':
            assert.equal(amountOfTokens, String(VLXNativeBalanceOnBlockchain));
            const tx = await velasNative.transfer({
              payerSeed: data.wallets.payer.seed,
              toAddress: data.wallets.withFunds.address,
              lamports: balanceUpdateAmount * 10 ** 9,
            });
            await velasNative.waitForConfirmedTransaction(tx);
            await walletsScreen.updateBalances();
            // const newAmountOfTokens = Number(await (await walletElement.$('.info .token.price'))?.getAttribute('title')).toFixed(6);
            const newAmountOfTokens = Number((await walletsScreen.getWalletsBalances())['Velas Native'])?.toFixed(6);
            assert.equal(newAmountOfTokens, (VLXNativeBalanceOnBlockchain + balanceUpdateAmount).toFixed(6), 'Velas Native wallet balance was not updated after funding it');
            break;
          case 'Bitcoin':
            assert.equal(amountOfTokens, '0.03484302');
            break;
          case 'Velas EVM':
            assert.equal(amountOfTokens, '13');
            break;
        }
      }
    });
  });
});

import { test } from '@playwright/test';
import { assert } from '../assert';
import { setupPage } from '../pw-helpers/setup-page';
import { Auth } from '../screens/auth';
import { WalletsScreen } from '../screens/wallets';
import { data } from '../test-data';
import { log } from '../tools/logger';
import { velasNative } from '@velas/velas-chain-test-wrapper';
import velasTestnet from '../api/velas-testnet/rpc';
import { getWalletURL } from '../config';

let auth: Auth;
let walletsScreen: WalletsScreen;

test.describe('Swap: ', () => {
  test.beforeEach(async ({ page }) => {
    setupPage(page);
    walletsScreen = new WalletsScreen(page);
    auth = new Auth(page);
    await page.goto(getWalletURL());
    await auth.loginByRestoringSeed(data.wallets.swap.seed);
    await walletsScreen.waitForWalletsDataLoaded();
  });

  test('VLX Legacy > VLX Native', async ({ page }) => {
    // TODO

    const vlxSenderInitialBalance = (await walletsScreen.getWalletsBalances())['token-vlx2'];
    // const nativeReceiverInitialBalance = await velasNative.getBalance(data.wallets.swap.address);
    const transactionAmount = 0.0001;

    await walletsScreen.swapTokens('token-vlx2', 'token-vlx_native', transactionAmount);
    await walletsScreen.openMenu('wallets');

    const previousTx = (await velasTestnet.getConfirmedTransactionsForAddress(data.wallets.swap.address)).signatures[0];
    let currentTx = previousTx;

    while (previousTx === currentTx) {
      log.debug('No new transactions in the chain, wait and retry...');
      await page.waitForTimeout(1000);
      currentTx = (await velasTestnet.getConfirmedTransactionsForAddress(data.wallets.swap.address)).signatures[0];
    }
    log.debug(currentTx);

    await walletsScreen.waitForWalletsDataLoaded();

    const vlxSenderFinalBalance = (await walletsScreen.getWalletsBalances())['token-vlx2'];
    assert.isBelow(Number(vlxSenderFinalBalance), Number(vlxSenderInitialBalance) - transactionAmount);

    // const nativeReceiverFinalBalance = await velasNative.getBalance(data.wallets.swap.address);
    // assert.equal(helpers.toFixed(nativeReceiverFinalBalance.VLX, 6), helpers.toFixed(nativeReceiverInitialBalance.VLX + transactionAmount));
  });

  test('VLX Native > VLX Legacy', async ({ page }) => {
    // TODO

    const nativeSenderInitialBalance = await velasNative.getBalance(data.wallets.swap.address);
    // const vlxReceiverInitialBalance = (await walletsScreen.getWalletsBalances())['token-vlx2'];

    const transactionAmount = 0.0001;

    await walletsScreen.swapTokens('token-vlx_native', 'token-vlx2', transactionAmount);

    const txSignatureLink = String(await page.getAttribute('.sent .text a', 'href'));
    const txSignature = txSignatureLink.replace('https://native.velas.com/tx/', '');
    log.debug(txSignature);
    await velasNative.waitForConfirmedTransaction(txSignature);

    await walletsScreen.openMenu('wallets');
    await walletsScreen.waitForWalletsDataLoaded();

    const nativeSenderFinalBalance = await velasNative.getBalance(data.wallets.swap.address);
    assert.isBelow(nativeSenderFinalBalance.VLX, nativeSenderInitialBalance.VLX - transactionAmount);

    // const vlxReceiverFinalBalance = (await walletsScreen.getWalletsBalances())['token-vlx2'];
    // assert.equal(helpers.toFixed(Number(vlxReceiverFinalBalance), 6), (helpers.toFixed(Number(vlxReceiverInitialBalance) + transactionAmount, 6)));
  });

  test('EVM > Legacy', async ({ page }) => {
    await walletsScreen.swapTokens('token-vlx_evm', 'token-vlx2', 0.0001);

    const txSignatureLink = String(await page.getAttribute('.sent .text a', 'href'));
    log.debug(txSignatureLink);

    assert.isTrue(txSignatureLink.includes('https://evmexplorer.testnet.velas.com/tx/'));
  });

  test('Legacy > EVM', async ({ page }) => {
    await walletsScreen.swapTokens('token-vlx2', 'token-vlx_evm', 0.0001);

    const txSignatureLink = String(await page.getAttribute('.sent .text a', 'href'));
    log.debug(txSignatureLink);

    assert.isTrue(txSignatureLink.includes('https://explorer.testnet.velas.com/tx/'));
  });

  test('EVM > Native', async ({ page }) => {
    await walletsScreen.swapTokens('token-vlx_evm', 'token-vlx_native', 0.0001);

    const txSignatureLink = String(await page.getAttribute('.sent .text a', 'href'));
    log.debug(txSignatureLink);

    assert.isTrue(txSignatureLink.includes('https://evmexplorer.testnet.velas.com/tx/'));
  });

  test('Native > EVM', async ({ page }) => {
    await walletsScreen.swapTokens('token-vlx_native', 'token-vlx_evm', 0.0001);

    const txSignatureLink = String(await page.getAttribute('.sent .text a', 'href'));
    const txSignature = txSignatureLink.replace('https://native.velas.com/tx/', '');
    log.debug(txSignature);

    await velasNative.waitForConfirmedTransaction(txSignature);
  });
});

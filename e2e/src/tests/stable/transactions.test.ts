import { test } from '@playwright/test';
import { velasNative } from '@velas/velas-chain-test-wrapper';
import { assert } from '../../assert';
import { walletURL } from '../../config';
import { setupPage } from '../../pw-helpers/setup-page';
import { Auth } from '../../screens/auth';
import { WalletsScreen } from '../../screens/wallets';
import { data } from '../../test-data';
import { helpers } from '../../tools/helpers';
import { infura } from "../../api/explorers-api";

let auth: Auth;
let walletsScreen: WalletsScreen;

test.describe.parallel('Transactions', () => {
  test.beforeEach(async ({ page }) => {
    setupPage(page);
    auth = new Auth(page);
    walletsScreen = new WalletsScreen(page);
    await page.goto(walletURL);
    await auth.loginByRestoringSeed(data.wallets.txSender.seed);
    await walletsScreen.waitForWalletsDataLoaded();
  });

  test('Send VLX native', async () => {
    await walletsScreen.addToken('token-vlx_native');

    const receiverInitialBalance = await velasNative.getBalance(data.wallets.fundsReceiver.address);
    const senderInitialBalance = await velasNative.getBalance(data.wallets.txSender.address);
    const transactionAmount = 0.0001;

    await walletsScreen.sendTx('token-vlx_native', 'FJWtmzRwURdnrgn5ZFWvYNfHvXMtHK1WS7VHpbnfG73s', transactionAmount);
    
    const txSignature = await walletsScreen.getTxHashFromTxlink();

    const tx = await velasNative.waitForConfirmedTransaction(txSignature);
    assert.exists(tx);

    const receiverFinalBalance = await velasNative.getBalance(data.wallets.fundsReceiver.address);
    assert.equal(helpers.toFixed(receiverFinalBalance.VLX, 6), helpers.toFixed((receiverInitialBalance.VLX + transactionAmount), 6));

    const senderFinalBalance = await velasNative.getBalance(data.wallets.txSender.address);
    assert.isBelow(senderFinalBalance.VLX, senderInitialBalance.VLX - transactionAmount, 'Final sender balance is not below the initial sender balance');
  });

  // TODO: network request error
  test.skip('Send BTC', async ({ page }) => {
    await walletsScreen.addToken('token-btc');

    await walletsScreen.sendTx('token-btc', 'mvvFj8fbFpL61S2HyhvcqEHjT2ThB1f78j', 0.00001);

    // TODO: btc chain api
    const txSignatureLink = await page.getAttribute('.sent .text a', 'href');
    if (!txSignatureLink) throw new Error('No txSignatureLink');
    assert.isTrue(txSignatureLink.includes('https://bitpay.com/insight/#/BTC/testnet/'));
  });

  // TODO: network request error
  test.skip('Send LTC', async ({ page }) => {
    await walletsScreen.addToken('token-ltc');

    await walletsScreen.sendTx('token-ltc', 'mvvFj8fbFpL61S2HyhvcqEHjT2ThB1f78j', 0.00001);

    // TODO: ltc chain api
    const txSignatureLink = await page.getAttribute('.sent .text a', 'href');
    if (!txSignatureLink) throw new Error('No txSignatureLink');
    assert.isTrue(txSignatureLink.includes('https://testnet.litecore.io/'));
  });

  test('Send ETH Legacy', async () => {
    await walletsScreen.addToken('token-eth_legacy');

    await walletsScreen.sendTx('token-eth_legacy', '0xb322f01cb6a191974e7291600a4dc1b46f00f752', 0.00001);
    const txSignature = await walletsScreen.getTxHashFromTxlink();
    await infura.waitForConfirmedTx(txSignature, 180000);
  });
});

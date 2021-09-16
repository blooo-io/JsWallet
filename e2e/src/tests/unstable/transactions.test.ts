import { test } from '@playwright/test';
import { velasNative } from '@velas/velas-chain-test-wrapper';
import { assert } from '../../assert';
import { getWalletURL } from '../../config';
import { setupPage } from '../../pw-helpers/setup-page';
import { Auth } from '../../screens/auth';
import { WalletsScreen } from '../../screens/wallets';
import { data } from '../../test-data';

let auth: Auth;
let walletsScreen: WalletsScreen;

test.describe('Transactions >', () => {
  test.beforeEach(async ({ page }) => {
    setupPage(page);
    auth = new Auth(page);
    walletsScreen = new WalletsScreen(page);
    await page.goto(getWalletURL());
    await auth.loginByRestoringSeed(data.wallets.txSender.seed);
    await walletsScreen.waitForWalletsDataLoaded();
  });

  test('Send VLX native', async ({ page }) => {
    const receiverInitialBalance = await velasNative.getBalance(data.wallets.fundsReceiver.address);
    const senderInitialBalance = await velasNative.getBalance(data.wallets.txSender.address);
    const transactionAmount = 0.0001;

    await walletsScreen.selectWallet('Velas Native');
    await page.click('#wallets-send');
    await page.fill('#send-recipient', 'FJWtmzRwURdnrgn5ZFWvYNfHvXMtHK1WS7VHpbnfG73s');
    await page.type('div.amount-field input[label="Send"]', String(transactionAmount));
    await page.click('#send-confirm');
    await page.click('#confirmation-confirm');

    const txSignatureLink = String(await page.getAttribute('.sent .text a', 'href'));
    const txSignature = txSignatureLink.replace('https://native.velas.com/tx/', '');
    if (!txSignature) throw new Error('Cannot get transaction signature from tx link');

    const tx = await velasNative.waitForConfirmedTransaction(txSignature);
    assert.exists(tx);
    
    // disable next steps because UI doesn't always create tx details element and receiver balance is checked anyway

    // await page.click('[datatesting="transaction"] div.more', { timeout: 10000 });
    // const receiverAddress = (await page.getAttribute('[datatesting="transaction"] .address-holder a[data-original]', 'data-original'))?.trim();
    // assert.equal(receiverAddress, data.wallets.fundsReceiver.address);

    const receiverFinalBalance = await velasNative.getBalance(data.wallets.fundsReceiver.address);
    assert.equal(receiverFinalBalance.VLX.toFixed(6), (receiverInitialBalance.VLX + transactionAmount).toFixed(6));

    const senderFinalBalance = await velasNative.getBalance(data.wallets.txSender.address);
    assert.isBelow(senderFinalBalance.VLX, senderInitialBalance.VLX - transactionAmount, 'Final sender balance is not below the initial sender balance');
  });

  test('Send BTC', async ({ page }) => {
    // TODO: network request error
    test.skip();

    await walletsScreen.selectWallet('Bitcoin');
    await page.click('#wallets-send');
    await page.fill('#send-recipient', 'mvvFj8fbFpL61S2HyhvcqEHjT2ThB1f78j', { timeout: 15000 }); //accound with index 2
    await page.type('div.amount-field input[label="Send"]', '0.00001');
    await page.click('#send-confirm');
    await page.click('#confirmation-confirm');

    const txSignatureLink = String(await page.getAttribute('.sent .text a', 'href'));
    assert.isTrue(txSignatureLink.includes('https://bitpay.com/insight/#/BTC/testnet/'));
  });

  test('Send LTC', async ({ page }) => {
    // TODO: network request error
    test.skip();

    await walletsScreen.addWalletsPopup.open();
    await walletsScreen.addWalletsPopup.add('Litecoin');
    await walletsScreen.waitForWalletsDataLoaded();

    await walletsScreen.selectWallet('Litecoin');
    await page.click('#wallets-send', { timeout: 10000 });
    await page.fill('#send-recipient', 'mvvFj8fbFpL61S2HyhvcqEHjT2ThB1f78j'); //accound with index 2
    await page.type('div.amount-field input[label="Send"]', '0.00001');
    await page.click('#send-confirm');
    await page.click('#confirmation-confirm');

    const txSignatureLink = String(await page.getAttribute('.sent .text a', 'href'));
    assert.isTrue(txSignatureLink.includes('https://testnet.litecore.io/'));
  });
});

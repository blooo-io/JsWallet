import { test } from '@playwright/test';
import { velasNative } from '@velas/velas-chain-test-wrapper';
import { assert } from '../../assert';
import { getWalletURL } from '../../config';
import { setupPage } from '../../pw-helpers/setup-page';
import { Auth } from '../../screens/auth';
import { Currency, WalletsScreen } from '../../screens/wallets';
import { data } from '../../test-data';
import { helpers } from '../../tools/helpers';
import balancesAPI from '../../api/balances-api';
import { log } from '../../tools/logger';

let auth: Auth;
let walletsScreen: WalletsScreen;

test.describe('Balance >', () => {
  test.beforeEach(async ({ page }) => {
    setupPage(page);
    auth = new Auth(page);
    walletsScreen = new WalletsScreen(page);
    await page.goto(getWalletURL());
    await auth.loginByRestoringSeed(data.wallets.withFunds.seed);
    await walletsScreen.waitForWalletsDataLoaded();
  });

  // extract "VLX Native balance update" to separate test
  test('Check VLX Legacy, VLX Native, Litecoin and Bitcoin balances', async () => {
    await walletsScreen.addWalletsPopup.open();
    await walletsScreen.addWalletsPopup.add('Litecoin');

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
          const newAmountOfTokens = helpers.toFixed(Number((await walletsScreen.getWalletsBalances())['Velas Native']), 6);
          assert.equal(newAmountOfTokens, helpers.toFixed((VLXNativeBalanceOnBlockchain + balanceUpdateAmount), 6), 'Velas Native wallet balance was not updated after funding it');
          break;
        case 'Bitcoin':
          try {
            await balancesAPI.bitcore();
            assert.equal(amountOfTokens, '0.03484302');
          } catch (e) {
            log.debug(e);
            log.warn(`Bitcoin balance check skipped because of 3rd party service is down`);
          }
          // TODO: make api request before to ckeck if service works; then uncomment next line
          break;
        case 'Velas EVM':
          assert.equal(amountOfTokens, '13');
          break;
        case 'Litecoin':
          //change balance when LTC testnet is up and address myVH5F64jS4gGvjoq4bMouuxQFLxEUmB8U is topped-up
          assert.equal(amountOfTokens, '0');
          break
      }
    }
  });
});

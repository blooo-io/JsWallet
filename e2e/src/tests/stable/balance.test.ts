import { test } from '@playwright/test';
import { velasNative } from '@velas/velas-chain-test-wrapper';
import { assert } from '../../assert';
import { walletURL } from '../../config';
import { setupPage } from '../../pw-helpers/setup-page';
import { Auth } from '../../screens/auth';
import { Currency, WalletsScreen } from '../../screens/wallets';
import { data } from '../../test-data';
import { helpers } from '../../tools/helpers';
import balancesAPI from '../../api/balances-api';
import { log } from '../../tools/logger';

let auth: Auth;
let walletsScreen: WalletsScreen;

test.describe('Balance', () => {
  test.beforeEach(async ({ page }) => {
    setupPage(page);
    auth = new Auth(page);
    walletsScreen = new WalletsScreen(page);
    await page.goto(walletURL);
    await auth.loginByRestoringSeed(data.wallets.withFunds.seed);
    await walletsScreen.waitForWalletsDataLoaded();
  });

  // extract "VLX Native balance update" to separate test
  test('Check VLX Legacy, VLX Native, Litecoin and Bitcoin balances', async () => {
    await walletsScreen.addWalletsPopup.open();
    await walletsScreen.addWalletsPopup.add('token-ltc');

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
        case 'token-vlx2':
          assert.equal(amountOfTokens, '0.999958');
          break;
        case 'token-vlx_native':
          assert.equal(amountOfTokens, String(VLXNativeBalanceOnBlockchain));
          const tx = await velasNative.transfer({
            payerSeed: data.wallets.payer.seed,
            toAddress: data.wallets.withFunds.address,
            lamports: balanceUpdateAmount * 10 ** 9,
          });
          await velasNative.waitForConfirmedTransaction(tx);
          await walletsScreen.updateBalances();
          // const newAmountOfTokens = Number(await (await walletElement.$('.info .token.price'))?.getAttribute('title')).toFixed(6);
          const newAmountOfTokens = helpers.toFixed(Number((await walletsScreen.getWalletsBalances())['token-vlx_native']), 6);
          assert.equal(newAmountOfTokens, helpers.toFixed((VLXNativeBalanceOnBlockchain + balanceUpdateAmount), 6), 'Velas Native wallet balance was not updated after funding it');
          break;
        case 'token-btc':
          try {
            await balancesAPI.bitcore();
            assert.equal(amountOfTokens, '0.03484302');
          } catch (e) {
            log.debug(e);
            log.warn(`Bitcoin balance check skipped because of 3rd party service is down`);
          }
          break;
        case 'token-vlx_evm':
          assert.equal(amountOfTokens, '11.99987802');
          break;
        case 'token-ltc':
          // ltc testnet is down
          //assert.equal(amountOfTokens, '0');
          break
      }
    }
  });
});

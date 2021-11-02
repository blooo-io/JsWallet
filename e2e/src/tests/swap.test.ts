import { test } from '@playwright/test';
import { setupPage } from '../pw-helpers/setup-page';
import { Auth } from '../screens/auth';
import { WalletsScreen } from '../screens/wallets';
import { data } from '../test-data';
import { log } from '../tools/logger';
import { velasNative } from '@velas/velas-chain-test-wrapper';
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

  
  test('VLX Native > VLX Legacy', async ({ page }) => {    
    await walletsScreen.swapTokens('token-vlx_native', 'token-vlx2', 0.0001);

    const txSignatureLink = String(await page.getAttribute('.sent .text a', 'href'));
    const txSignature = txSignatureLink.replace('https://native.velas.com/tx/', '');
    log.debug(txSignature);

    await velasNative.waitForConfirmedTransaction(txSignature);
  });
  
  test('VLX Native > EVM', async ({ page }) => {
    await walletsScreen.swapTokens('token-vlx_native', 'token-vlx_evm', 0.0001);

    const txSignatureLink = String(await page.getAttribute('.sent .text a', 'href'));
    const txSignature = txSignatureLink.replace('https://native.velas.com/tx/', '');
    log.debug(txSignature);

    await velasNative.waitForConfirmedTransaction(txSignature);
  });

  test('VLX Legacy > VLX Native', async () => {
    await walletsScreen.swapTokens('token-vlx2', 'token-vlx_native', 0.0001);
    await walletsScreen.confirmTxFromEvmExplorer();
  });
  
  test('VLX Legacy > EVM', async () => {
    await walletsScreen.swapTokens('token-vlx2', 'token-vlx_evm', 0.0001);
    await walletsScreen.confirmTxFromEvmExplorer();
  });

  test('EVM > VLX Legacy', async () => {
    await walletsScreen.swapTokens('token-vlx_evm', 'token-vlx2', 0.0001);
    await walletsScreen.confirmTxFromEvmExplorer();
  });

  test('EVM > VLX Native', async () => {
    await walletsScreen.swapTokens('token-vlx_evm', 'token-vlx_native', 0.0001);
    await walletsScreen.confirmTxFromEvmExplorer();
  });

  test('EVM > VLX ERC-20', async () => {
    await walletsScreen.swapTokens('token-vlx_evm', 'token-vlx_erc20', 0.01);
    await walletsScreen.confirmTxFromEvmExplorer();
  });
});

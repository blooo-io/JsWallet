import { test } from '@playwright/test';
import { setupPage } from '../../pw-helpers/setup-page';
import { Auth } from '../../screens/auth';
import { WalletsScreen } from '../../screens/wallets';
import { data } from '../../test-data';
import { log } from '../../tools/logger';
import { velasNative } from '@velas/velas-chain-test-wrapper';
import { walletURL } from '../../config';
import { evmchain, infura, hecochain, bscchain } from "../../api/explorers-api";

let auth: Auth;
let walletsScreen: WalletsScreen;

test.describe('Swap: ', () => {
  test.beforeEach(async ({ page }) => {
    setupPage(page);
    walletsScreen = new WalletsScreen(page);
    auth = new Auth(page);
    await page.goto(walletURL);
    await auth.loginByRestoringSeed(data.wallets.swap.seed);
    await walletsScreen.waitForWalletsDataLoaded();
  });

  test.describe('In Velas network: ', () => {
    test('VLX Native > EVM', async ({ page }) => {
      await walletsScreen.swapTokens('token-vlx_native', 'token-vlx_evm', 0.0001);
      await page.waitForSelector('.sent .text a', { timeout: 30000 });
      const txSignatureLink = await page.getAttribute('.sent .text a', 'href');
      if (!txSignatureLink) throw new Error('No txSignatureLink');
      const txSignature = txSignatureLink.replace('https://native.velas.com/tx/', '');
      log.debug(`txSignature: ${txSignature}`);

      await velasNative.waitForConfirmedTransaction(txSignature);
    });

    test('EVM > VLX Native', async () => {
      await walletsScreen.swapTokens('token-vlx_evm', 'token-vlx_native', 0.0001);
      const txHash = await walletsScreen.getTxHashFromTxlink();
      await evmchain.waitForConfirmedTx(txHash, 180000);
    });

    // Legacy is irrelevant
    test.skip('VLX Native > VLX Legacy', async ({ page }) => {
      await walletsScreen.swapTokens('token-vlx_native', 'token-vlx2', 0.0001);
      await page.waitForSelector('.sent .text a', { timeout: 30000 });
      const txSignatureLink = await page.getAttribute('.sent .text a', 'href');
      if (!txSignatureLink) throw new Error('No txSignatureLink');
      const txSignature = txSignatureLink.replace('https://native.velas.com/tx/', '');
      log.debug(`txSignature: ${txSignature}`);
      await velasNative.waitForConfirmedTransaction(txSignature);
    });

    // Legacy is irrelevant
    test.skip('VLX Legacy > VLX Native', async () => {
      await walletsScreen.swapTokens('token-vlx2', 'token-vlx_native', 0.0001);
      const txHash = await walletsScreen.getTxHashFromTxlink();
      await evmchain.waitForConfirmedTx(txHash, 180000);
    });

    // Legacy is irrelevant
    test.skip('VLX Legacy > EVM', async () => {
      await walletsScreen.swapTokens('token-vlx2', 'token-vlx_evm', 0.0001);
      const txHash = await walletsScreen.getTxHashFromTxlink();
      await evmchain.waitForConfirmedTx(txHash, 180000);
    });

    // Legacy is irrelevant
    test.skip('EVM > VLX Legacy', async () => {
      await walletsScreen.swapTokens('token-vlx_evm', 'token-vlx2', 0.0001);
      const txHash = await walletsScreen.getTxHashFromTxlink();
      await evmchain.waitForConfirmedTx(txHash, 180000);
    });
  });

  test.describe('From Velas network: ', async () => {
    test('EVM > HRC-20', async () => {
      await walletsScreen.swapTokens('token-vlx_evm', 'token-vlx_huobi', 0.0001);
      const txHash = await walletsScreen.getTxHashFromTxlink();
      await evmchain.waitForConfirmedTx(txHash, 180000);
    });

    test('EVM > VLX ERC-20', async () => {
      await walletsScreen.swapTokens('token-vlx_evm', 'token-vlx_erc20', 0.01);
      const txHash = await walletsScreen.getTxHashFromTxlink();
      await evmchain.waitForConfirmedTx(txHash, 180000);
    });

    test('EVM > BEP-20', async () => {
      await walletsScreen.swapTokens('token-vlx_evm', 'token-bsc_vlx', 1);
      const txHash = await walletsScreen.getTxHashFromTxlink();
      await evmchain.waitForConfirmedTx(txHash, 180000);
    });

    // TODO: fix ETH > ETH velas bridge
    test.skip('ETH Velas > ETH', async () => {
      await walletsScreen.swapTokens('token-vlx_eth', 'token-eth', 0.1);
      const txHash = await walletsScreen.getTxHashFromTxlink();
      await evmchain.waitForConfirmedTx(txHash, 180000);
    });

    test('USDT Velas > USDT', async () => {
      await walletsScreen.swapTokens('token-vlx_usdt', 'token-usdt_erc20', 0.001);
      const txHash = await walletsScreen.getTxHashFromTxlink();
      await evmchain.waitForConfirmedTx(txHash, 180000);
    });

    test('USDC Velas > USDC', async () => {
      await walletsScreen.swapTokens('token-vlx_usdc', 'token-usdc', 0.001);
      const txHash = await walletsScreen.getTxHashFromTxlink();
      await evmchain.waitForConfirmedTx(txHash, 180000);
    });

    test('BUSD Velas > BUSD', async () => {
      await walletsScreen.swapTokens('token-vlx_busd', 'token-busd', 0.01);
      const txHash = await walletsScreen.getTxHashFromTxlink();
      await evmchain.waitForConfirmedTx(txHash, 180000);
    });
  });

  test.describe('To Velas network', async () => {
    test('HRC-20 > EVM', async () => {
      await walletsScreen.swapTokens('token-vlx_huobi', 'token-vlx_evm', 0.0001);
      const txHash = await walletsScreen.getTxHashFromTxlink();
      await hecochain.waitForConfirmedTx(txHash, 180000);
    });

    test('ERC-20 > EVM', async () => {
      await walletsScreen.swapTokens('token-vlx_erc20', 'token-vlx_evm', 0.01);
      const txHash = await walletsScreen.getTxHashFromTxlink();
      await infura.waitForConfirmedTx(txHash, 180000);
    });

    // TODO: fix VLWA-904 (bsc network issue)
    test.skip('BEP-20 > EVM', async () => {
      await walletsScreen.swapTokens('token-bsc_vlx', 'token-vlx_evm', 1);
      const txHash = await walletsScreen.getTxHashFromTxlink();
      await bscchain.waitForConfirmedTx(txHash, 180000);
    });

    // TODO: fix ETH > ETH velas bridge
    test.skip('ETH > ETH Velas', async () => {
      await walletsScreen.swapTokens('token-eth', 'token-vlx_eth', 0.1);
      const txHash = await walletsScreen.getTxHashFromTxlink();
      await infura.waitForConfirmedTx(txHash, 180000);
    });

    test('USDT > USDT Velas', async () => {
      await walletsScreen.swapTokens('token-usdt_erc20', 'token-vlx_usdt', 0.001);
      const txHash = await walletsScreen.getTxHashFromTxlink();
      await infura.waitForConfirmedTx(txHash, 180000);
    });

    test('USDC > USDC Velas', async () => {
      await walletsScreen.swapTokens('token-usdc', 'token-vlx_usdc', 0.001);
      const txHash = await walletsScreen.getTxHashFromTxlink();
      await infura.waitForConfirmedTx(txHash, 180000);
    });

    // TODO: fix VLWA-904 (bsc network issue)
    test.skip('BUSD > BUSD Velas', async () => {
      await walletsScreen.swapTokens('token-busd', 'token-vlx_busd', 0.01);
      const txHash = await walletsScreen.getTxHashFromTxlink();
      await bscchain.waitForConfirmedTx(txHash, 180000);
    });
  });
});

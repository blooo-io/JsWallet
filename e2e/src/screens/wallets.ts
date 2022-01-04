import { log } from '../tools/logger';
import { ElementHandle, Page } from '../types';
import { BaseScreen } from './base';

export type Currency =
  | 'token-vlx_native'
  | 'token-vlx_evm'
  | 'token-vlx2'
  | 'token-vlx_usdc'
  | 'token-vlx_usdt'
  | 'token-vlx_eth'
  | 'token-vlx_evm_legacy'
  | 'token-vlx_busd'
  | 'token-btc'
  | 'token-eth'
  | 'token-vlx_erc20'
  | 'token-usdc'
  | 'token-usdt_erc20'
  | 'token-eth_legacy'
  | 'token-usdt_erc20_legacy'
  | 'token-ltc'
  | 'token-vlx_huobi'
  | 'token-huobi'
  | 'token-bnb'
  | 'token-busd'
  | 'token-bsc_vlx';
import { Network } from '../types';

export type Balances = Record<Currency, string | null>;

type CustomTokenNetwork = 'Velas' | 'Ethereum' | 'Heco' | 'BSC';
type NetworkType = Exclude<Network, 'devnet'>;

export class WalletsScreen extends BaseScreen {
  constructor(public page: Page) {
    super(page);
  }

  async refresh(): Promise<void> {
    await this.page.click('.balance .button');
  }

  async getWalletAddress(): Promise<string> {
    await this.page.waitForSelector('div.wallet-detailed a[data-original]');
    return (
      (
        await this.page.getAttribute(
          'div.wallet-detailed a[data-original]',
          'data-original'
        )
      )?.trim() || ''
    );
  }

  async selectWallet(tokenName: Currency): Promise<void> {
    await this.waitForWalletsDataLoaded();
    const tokenSelector = `div.big.wallet-item#${tokenName}`;
    // some time is required to load wallets and switch between them; so custom waiter is implemented
    let requiredCurrencyIsALreadySelected = await this.page.isVisible(
      tokenSelector
    );
    while (!requiredCurrencyIsALreadySelected) {
      await this.page.click(`#${tokenName}`);
      await this.page.waitForTimeout(1000);
      requiredCurrencyIsALreadySelected = await this.page.isVisible(
        tokenSelector
      );
    }
    log.debug(`${tokenName} was selected`);
    await this.waitForWalletsDataLoaded();
  }

  async getWalletsBalances(): Promise<Balances> {
    await this.waitForWalletsDataLoaded();
    const walletElements = await this.page.$$('.wallet-item');
    const balances: Balances = {
      'token-vlx_native': null,
      'token-vlx_evm': null,
      'token-vlx2': null,
      'token-vlx_usdc': null,
      'token-vlx_usdt': null,
      'token-vlx_eth': null,
      'token-vlx_evm_legacy': null,
      'token-vlx_busd': null,
      'token-btc': null,
      'token-eth': null,
      'token-vlx_erc20': null,
      'token-usdc': null,
      'token-usdt_erc20': null,
      'token-eth_legacy': null,
      'token-usdt_erc20_legacy': null,
      'token-ltc': null,
      'token-vlx_huobi': null,
      'token-huobi': null,
      'token-bnb': null,
      'token-busd': null,
      'token-bsc_vlx': null,
    };

    for (let i = 0; i < walletElements.length; i++) {
      const walletElement = walletElements[i];
      const tokenId: Currency = (await this.getTokenIdOfWalletItemElement(
        walletElement
      )) as Currency;

      // skip if wallet is not in the wallets list
      if (!(await this.isWalletInWalletsList(tokenId))) continue;

      const amountOfTokens =
        await this.getAmountOfTokensFromOfWalletItemElement(walletElement);
      if (amountOfTokens === '..') continue;
      balances[tokenId] = amountOfTokens;
    }
    log.info(balances);
    return balances;
  }

  async isWalletInWalletsList(tokenName: Currency): Promise<boolean> {
    return this.page.isVisible(`#${tokenName}`);
  }

  async getAmountOfTokensFromOfWalletItemElement(
    walletElement: ElementHandle<SVGElement | HTMLElement>
  ): Promise<string> {
    const amountOfTokens = await (
      await walletElement.$('.info .token.price')
    )?.getAttribute('title');
    if (!amountOfTokens) throw new Error('Cannot get amount of tokens');
    return amountOfTokens;
  }

  private async getTokenNameOfWalletItemElement(
    walletElement: ElementHandle<SVGElement | HTMLElement>
  ): Promise<string> {
    const tokenName = (
      await (await walletElement.$('.balance.title'))?.textContent()
    )?.trim();
    if (!tokenName) throw new Error('Cannot get token name');
    return tokenName;
  }

  private async getTokenIdOfWalletItemElement(
    walletElement: ElementHandle<SVGElement | HTMLElement>
  ): Promise<string> {
    const tokenId = await walletElement.getAttribute('id');
    if (!tokenId) throw new Error('Cannot get token id');
    return tokenId;
  }

  async updateBalances(): Promise<void> {
    await this.page.click('.balance .button.lock');
    await this.waitForWalletsDataLoaded();
  }

  async hideWallet(): Promise<void> {
    await this.waitForWalletsDataLoaded();
    await this.page.click('.wallet-header .uninstall');
    await this.waitForWalletsDataLoaded();
  }

  async waitForWalletsDataLoaded(): Promise<void> {
    await this.page.waitForSelector('.wallet-item .top-left [class=" img"]', {
      state: 'visible',
      timeout: 31000,
    });
    await this.page.waitForTimeout(100);
  }

  addWalletsPopup = {
    open: async () => {
      await this.page.click('.header .button.lock.mt-5');
    },
    add: async (tokenName: Currency) => {
      const addTokenButton = await this.page.$(`#add-${tokenName} button`);
      await addTokenButton?.scrollIntoViewIfNeeded();
      await addTokenButton?.click();
    },
  };

  async swapTokens(
    fromToken: Currency,
    toToken: Currency,
    transactionAmount: number | 'use max',
    params?: { customAddress?: string }
  ): Promise<void> {
    if (fromToken === toToken) {
      throw TypeError("You can't swap to the same token you are swapping from");
    }

    await this.addToken(fromToken);
    await this.addToken(toToken);
    await this.selectWallet(fromToken);
    await this.swap.click();
    await this.swap.chooseDestinationNetwork(toToken);

    if (params?.customAddress) {
      await this.page.fill('#send-recipient', params.customAddress);
    }

    if (transactionAmount === 'use max') {
      await this.page.click('#send-max');
    } else {
      await this.swap.fill(String(transactionAmount));
    }

    // wait for amount error disappears
    await this.page.waitForTimeout(300);
    await this.swap.confirm();
  }

  private async clickSwapButton(): Promise<void> {
    await this.page.waitForSelector('.with-swap #wallet-swap');
    for (let i = 0; i < 5; i++) {
      try {
        await this.page.click('.with-swap #wallet-swap');
        return;
      } catch {
        log.debug(
          `There was attempt to click the Swap button but it's inactive. Retry in 1 sec...`
        );
        await this.page.waitForTimeout(1000);
      }
    }
  }

  private swap = {
    click: async () => {
      await this.clickSwapButton();
      await this.page.waitForSelector('.network-slider');
    },
    fill: async (transactionAmount: string) => {
      await this.page.fill(
        'div.amount-field .input-area input[label="Send"]',
        transactionAmount
      );
    },
    destinationNetwork: async (swapToToken: Currency): Promise<string> => {
      switch (swapToToken) {
        case 'token-vlx2':
          return 'Velas Legacy';
        case 'token-vlx_native':
          return 'Velas Native';
        case 'token-vlx_evm':
          return 'Velas EVM';
        case 'token-bsc_vlx':
          return 'Binance';
        case 'token-vlx_huobi':
          return 'Huobi ECO Chain';
        case 'token-vlx_erc20':
          return 'Ethereum';
        default:
          return 'default';
      }
    },
    chooseDestinationNetwork: async (swapToToken: Currency) => {
      if (await this.page.isVisible('.inactive.navigation-button')) {
        return;
      }
      const destinationNetwork = await this.swap.destinationNetwork(
        swapToToken
      );

      let chosenNetwork = await this.page.getAttribute(
        '.change-network',
        'value'
      );
      if (chosenNetwork !== destinationNetwork) {
        await this.page.click('.network-slider .right');
        chosenNetwork = await this.page.getAttribute(
          '.change-network',
          'value'
        );
        const destinationNetowkSelector = `.switch-menu div:text-matches("${destinationNetwork}", "i")`;
        await this.page.click(destinationNetowkSelector);
        await this.waitForSelectorDisappears('.switch-menu');
      }
    },
    confirm: async () => {
      await this.page.waitForSelector('#send-confirm:not([disabled])', { timeout: 5000 });

      let confirmationAlert = await this.page.$('#confirmation-confirm');
      let counter = 0;

      // TODO: rewrite; click should not be retried
      while (!confirmationAlert && counter < 3) {
        try {
          await this.page.click('#confirmation-confirm', { timeout: 5000 });
          return;
        } catch {
          counter++;
          await this.page.click('#send-confirm');
          log.debug(`There was attempt to click the Send button but no confirmation alert, retry and wait for confirmation...`)
        }
      }
      await this.page.waitForSelector('.sent .text a:not([href=""])', { timeout: 30000 });
    },
  };

  async confirmTxFromEvmExplorer(): Promise<void> {
    const [txPage] = await Promise.all([
      this.context.waitForEvent('page'),
      this.page.click('.sent .text a'),
    ]);

    let url = txPage.url();
    if (url.includes('https://explorer.testnet.velas.com/')) {
      url = url.replace('https://explorer', 'https://evmexplorer');
      await txPage.goto(url);
    }

    await txPage.waitForLoadState();

    const startTime = new Date().getTime();
    let timePassedInSeconds = 0;
    const secondsToWait = 180;
    while (await txPage.isVisible('.error-title')) {
      timePassedInSeconds = (new Date().getTime() - startTime) / 100;
      if (timePassedInSeconds > secondsToWait)
        throw new Error(`Tx hash not been found on explorer during ${secondsToWait} seconds
      ${txPage.url()}`);

      await txPage.waitForLoadState();
      log.debug(
        `Tx hash not been found on explorer, refreshing...\n${txPage.url()}`
      );
      await txPage.waitForTimeout(1000);
      await txPage.reload();
    }

    await txPage.waitForSelector('[data-transaction-status="Success"]');
  }

  async confirmTxFromForeignExplorer(): Promise<void> {
    const [txPage] = await Promise.all([
      this.context.waitForEvent('page'),
      this.page.click('.sent .text a'),
    ]);

    await txPage.waitForLoadState();

    let url = txPage.url();

    if (url.includes('https://testnet.hecoinfo.com/')) {
      await this.foreignExplorer.waitForTxPending(txPage);
      await this.foreignExplorer.waitForTxFound(txPage);
    } else {
      await this.foreignExplorer.waitForTxFound(txPage);
      await this.foreignExplorer.waitForTxPending(txPage);
    }

    await this.foreignExplorer.waitForTxIndexing(txPage);

    try {
      await txPage.waitForSelector('span.rounded:has-text("Success")');
    } catch (e) {
      await txPage.waitForSelector('span.rounded:has-text("Fail")');
      throw new Error(`Transaction ${txPage.url()} has failed`);
    }
  }

  private foreignExplorer = {
    waitForTxFound: async (page: Page) => {
      const startTime = new Date().getTime();
      let timePassedInSeconds = 0;
      const secondsToWait = 180;
      while (await page.isVisible('.normalMode[alt="Search Not Found"]')) {
        timePassedInSeconds = (new Date().getTime() - startTime) / 100;
        if (timePassedInSeconds > secondsToWait)
          throw new Error(`Tx hash not been found on explorer during ${secondsToWait} seconds
        ${page.url()}`);

        await page.waitForLoadState();
        log.debug(
          `Tx hash not been found on explorer, refreshing...\n${page.url()}`
        );
        await page.waitForTimeout(1000);
        await page.reload();
      }
    },
    waitForTxPending: async (page: Page) => {
      const startTime = new Date().getTime();
      let timePassedInSeconds = 0;
      const secondsToWait = 180;
      while (await page.isVisible('span.rounded:has-text("Pending")')) {
        timePassedInSeconds = (new Date().getTime() - startTime) / 100;
        if (timePassedInSeconds > secondsToWait)
          throw new Error(`Tx hash not been found on explorer during ${secondsToWait} seconds
        ${page.url()}`);

        await page.waitForLoadState();
        log.debug(`Tx is pending, refreshing...\n${page.url()}`);
        await page.waitForTimeout(1000);
        await page.reload();
      }
    },
    waitForTxIndexing: async (page: Page) => {
      const startTime = new Date().getTime();
      let timePassedInSeconds = 0;
      const secondsToWait = 180;
      while (await page.isVisible('span.rounded:has-text("Indexing")')) {
        timePassedInSeconds = (new Date().getTime() - startTime) / 100;
        if (timePassedInSeconds > secondsToWait)
          throw new Error(`Tx hash not been found on explorer during ${secondsToWait} seconds
        ${page.url()}`);

        await page.waitForLoadState();
        log.debug(`Tx is indexing, refreshing...\n${page.url()}`);
        await page.waitForTimeout(1000);
        await page.reload();
      }
    },
  };

  async getLastTxSignatureInHistory(): Promise<string> {
    await this.page.click('[datatesting="transaction"] div.more', {
      timeout: 15000,
    });

    const lastTxSignatureElementSelector =
      '[datatesting="transaction"] .tx-middle .txhash a[data-original]';
    const lastTxSignature = (
      await this.page.getAttribute(
        lastTxSignatureElementSelector,
        'data-original'
      )
    )?.trim();
    if (!lastTxSignature)
      throw new Error(
        `Cannot get transaction signature from element with selector ${lastTxSignatureElementSelector}`
      );
    await this.page.click('[datatesting="transaction"] div.more');
    return lastTxSignature;
  }

  async waitForTxHistoryUpdated(previousTxSignature: string): Promise<void> {
    let currentTxSignature = await this.getLastTxSignatureInHistory();
    while (currentTxSignature === previousTxSignature) {
      log.warn("History hasn't been updated. Wait and refresh the history...");
      await this.page.waitForTimeout(2000);
      await this.refresh();
      currentTxSignature = await this.getLastTxSignatureInHistory();
    }
  }

  async addToken(currency: Currency): Promise<void> {
    await this.waitForWalletsDataLoaded();
    if (!(await this.isWalletInWalletsList(currency))) {
      await this.addWalletsPopup.open();
      await this.addWalletsPopup.add(currency);
    } else {
      log.info(
        `You tried to add token "${currency}" but it's already in the list.`
      );
    }
  }

  async addCustomToken(
    contract: string,
    customTokenNetwork: CustomTokenNetwork,
    networkType: NetworkType
  ): Promise<void> {
    await this.addWalletsPopup.open();
    await this.page.click('#add-custom-token');
    await this.page.click('.default-network-input .button');
    await this.page.click(
      `.network-item-title:has-text('${customTokenNetwork}') + .networks .${networkType}-network`
    );
    await this.waitForSelectorDisappears('.switch-menu');
    await this.page.fill('#contract-address', `${contract}`);
    await this.page.waitForSelector('#send-confirm:not([disabled])');
    await this.page.click('#send-confirm');

    const pageLoaderSelector = '.loading-pulse';
    while (await this.page.isVisible(pageLoaderSelector)) {
      await this.page.waitForTimeout(500);
    }

    await this.waitForSelectorDisappears('#add-custom-token');
  }

  async getTxHashFromTxlink(): Promise<string> {
    const txSignatureLink = await this.page.getAttribute(
      '.sent .text a',
      'href'
    );
    if (!txSignatureLink) throw new Error('No txSignatureLink');
    let txSignature = txSignatureLink.replace(/^.*tx\//, '');
    txSignature = txSignature.replace(/\/.*/, '');
    if (!txSignature)
      throw new Error('Cannot get transaction signature from tx link');
    log.debug(`Obtained tx signature: ${txSignature}`);
    return txSignature;
  }

  async sendTx(fromToken: Currency, toAddress: string, transactionAmount: number): Promise<void> {
    await this.selectWallet(fromToken);
    await this.page.click('#wallets-send', { timeout: 10000 });
    await this.page.fill('#send-recipient', toAddress);
    await this.page.fill('div.amount-field input[label="Send"]', String(transactionAmount));
    await this.page.click('#send-confirm:not([disabled])');
    await this.page.waitForSelector('#confirmation-confirm', { timeout: 30000 });
    await this.page.click('#confirmation-confirm');
  }
}

import { log } from '../tools/logger';
import { ElementHandle, Page } from '../types';
import { BaseScreen } from './base';

export type Currency = 'Bitcoin' | 'Velas' | 'Velas Native' | 'Velas EVM' | 'Litecoin' | 'Ethereum' | 'Ethereum Legacy';
export type Balances = Record<Currency, string | null>;

export class WalletsScreen extends BaseScreen {
  constructor(public page: Page) {
    super(page);
  }

  async refresh(): Promise<void> {
    await this.page.click('.balance .button');
  }

  async getWalletAddress(): Promise<string> {
    await this.page.waitForSelector('div.wallet-detailed a[data-original]');
    return (await this.page.getAttribute('div.wallet-detailed a[data-original]', 'data-original'))?.trim() || '';
  }

  async selectWallet(tokenName: Currency): Promise<void> {
    await this.waitForWalletsDataLoaded();
    const tokenNameSelector = `div.big.wallet-item .balance.title:text-matches("^ ${tokenName}$")`;
    // some time is required to load wallets and switch between them; so custom waiter is implemented
    let requiredCurrencyIsALreadySelected = await this.page.isVisible(tokenNameSelector);
    while (!requiredCurrencyIsALreadySelected) {
      await this.page.click(`.balance.title:text(" ${tokenName}")`);
      await this.page.waitForTimeout(1000);
      requiredCurrencyIsALreadySelected = await this.page.isVisible(tokenNameSelector);
    }
    log.debug(`${tokenName} was selected`);
    await this.waitForWalletsDataLoaded();
  }

  async getWalletsBalances(): Promise<Balances> {
    await this.waitForWalletsDataLoaded();
    const walletElements = await this.page.$$('.wallet-item');
    const balances: Balances = {
      'Velas': null,
      'Velas EVM': null,
      'Velas Native': null,
      Bitcoin: null,
      Litecoin: null,
      Ethereum: null,
      'Ethereum Legacy': null
    };

    for (let i = 0; i < walletElements.length; i++) {
      const walletElement = walletElements[i];
      const tokenName: Currency = await this.getTokenNameOfWalletItemElement(walletElement) as Currency;

      // skip if wallet is not in the wallets list
      if (!await this.isWalletInWalletsList(tokenName)) continue;

      const amountOfTokens = await this.getAmountOfTokensFromOfWalletItemElement(walletElement);
      if (amountOfTokens === '..') continue;
      balances[tokenName] = amountOfTokens;
    }
    log.info(balances);
    return balances;
  }

  async isWalletInWalletsList(tokenName: Currency): Promise<boolean> {
    return this.page.isVisible(`.balance.title:text(" ${tokenName}")`);
  }

  private async getAmountOfTokensFromOfWalletItemElement(walletElement: ElementHandle<SVGElement | HTMLElement>): Promise<string> {
    const amountOfTokens = await (await walletElement.$('.info .token.price'))?.getAttribute('title');
    if (!amountOfTokens) throw new Error('Cannot get amount of tokens');
    return amountOfTokens;
  }

  private async getTokenNameOfWalletItemElement(walletElement: ElementHandle<SVGElement | HTMLElement>): Promise<string> {
    const tokenName = (await (await walletElement.$('.balance.title'))?.textContent())?.trim();
    if (!tokenName) throw new Error('Cannot get token name');
    return tokenName;
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
    await this.page.waitForSelector('.wallet-item .top-left [class=" img"]', { state: 'visible', timeout: 31000 });
    await this.page.waitForTimeout(100);
  }

  addWalletsPopup = {
    open: async () => {
      await this.page.click('.header .button.lock.mt-5');
    },
    add: async (tokenName: Currency) => {
      const walletItemsList = await this.page.$$('.manage-account .settings .list .item');
      for (let i = 0; i < walletItemsList.length; i++) {
        const walletItem = walletItemsList[i];
        const wallenTokenName = (await (await walletItem.$(`span.title:text("${tokenName}")`))?.textContent())?.trim();
        const addButton = await walletItem.$('button');
        if (wallenTokenName === tokenName) {
          await addButton?.click();
        }
      }
    }
  }

  async swapTokens(swapFromToken: Currency, swapToToken: Currency, transactionAmount: number): Promise<void> {
    if (swapFromToken === swapToToken){
      throw TypeError('You can\'t swap to the same token you are swapping from');
    }

    await this.selectWallet(swapFromToken);
  
    await this.swap.click();

    await this.swap.fill(String(transactionAmount));

    await this.swap.chooseDestinationNetwork(swapToToken);

    await this.swap.confirm();
  }

  private async clickSwapButton(): Promise<void> {
    await this.page.waitForSelector('.with-swap #wallet-swap');
    for (let i = 0; i < 5; i++) {
      try {
        await this.page.click('.with-swap #wallet-swap');
      } catch {
        log.warn(`There was attempt to click the Swap button but it's inactive. Retry in 1 sec...`);
        await this.page.waitForTimeout(1000);
      }
    }
  }

  private swap = {
    click: async() => {
      await this.clickSwapButton();
      await this.page.waitForSelector('.network-slider');
    },
    fill: async(transactionAmount: string) => {
      await this.page.fill('div.amount-field .input-area input[label="Send"]', transactionAmount);
    },
    chooseDestinationNetwork: async(swapToToken: Currency) => {
      let chosenNetwork = await this.page.getAttribute('.change-network', 'value');
      let switchCount = 0;
      while (chosenNetwork !== swapToToken.toUpperCase()){
        await this.page.click('.network-slider .right');
        chosenNetwork = await this.page.getAttribute('.change-network', 'value');
        switchCount++;
        if (switchCount > 10) throw new Error(`Cannot switch to destination currency "${swapToToken}" inside swap menu`);
      }
    },
    confirm: async() => {
      await this.page.click('#send-confirm');
      await this.page.click('#confirmation-confirm', {timeout: 10000});
    },
  }

  async getLastTxSignatureInHistory(): Promise<string> {
    await this.page.click('[datatesting="transaction"] div.more', {timeout: 15000});

    const lastTxSignatureElementSelector = '[datatesting="transaction"] .tx-middle .txhash a[data-original]';
    const lastTxSignature = (await this.page.getAttribute(lastTxSignatureElementSelector, 'data-original'))?.trim();
    if (!lastTxSignature) throw new Error(`Cannot get transaction signature from element with selector ${lastTxSignatureElementSelector}`)
    await this.page.click('[datatesting="transaction"] div.more');
    return lastTxSignature;
  }

  async waitForTxHistoryUpdated(previousTxSignature: string): Promise<void> {
    let currentTxSignature = await this.getLastTxSignatureInHistory();
    while (currentTxSignature === previousTxSignature) {
      log.warn('History hasn\'t been updated. Wait and refresh the history...');
      await this.page.waitForTimeout(2000);
      await this.refresh();
      currentTxSignature = await this.getLastTxSignatureInHistory();
    }
  }
}

import { helpers } from '../tools/helpers';
import { log } from '../tools/logger';
import { ElementHandle, Page } from '../types';
import { BaseScreen } from './base';

export type Currency = 'token-vlx_native' | 'token-vlx_evm' | 'token-vlx2' | 'token-vlx_usdc' | 'token-vlx_usdt' | 'token-vlx_eth' | 'token-vlx_evm_legacy' | 'token-vlx_busd' | 'token-btc' | 'token-eth' | 'token-vlx_erc20' | 'token-usdc' | 'token-usdt_erc20' | 'token-eth_legacy' | 'token-usdt_erc20_legacy' | 'token-ltc' | 'token-vlx_huobi' | 'token-huobi' | 'token-bnb' | 'token-busd' | 'token-bsc_vlx';

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
    const tokenSelector = `div.big.wallet-item#${tokenName}`;
    // some time is required to load wallets and switch between them; so custom waiter is implemented
    let requiredCurrencyIsALreadySelected = await this.page.isVisible(tokenSelector);
    while (!requiredCurrencyIsALreadySelected) {
      await this.page.click(`#${tokenName}`);
      await this.page.waitForTimeout(1000);
      requiredCurrencyIsALreadySelected = await this.page.isVisible(tokenSelector);
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
      'token-bsc_vlx': null      
    };

    for (let i = 0; i < walletElements.length; i++) {
      const walletElement = walletElements[i];
      const tokenId: Currency = await this.getTokenIdOfWalletItemElement(walletElement) as Currency;

      // skip if wallet is not in the wallets list
      if (!await this.isWalletInWalletsList(tokenId)) continue;

      const amountOfTokens = await this.getAmountOfTokensFromOfWalletItemElement(walletElement);
      if (amountOfTokens === '..') continue;
      balances[tokenId] = amountOfTokens;
    }
    log.info(balances);
    return balances;
  }

  async isWalletInWalletsList(tokenName: Currency): Promise<boolean> {
    return this.page.isVisible(`#${tokenName}`);
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

  private async getTokenIdOfWalletItemElement(walletElement: ElementHandle<SVGElement | HTMLElement>): Promise<string> {
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
    await this.page.waitForSelector('.wallet-item .top-left [class=" img"]', { state: 'visible', timeout: 31000 });
    await this.page.waitForTimeout(100);
  }

  addWalletsPopup = {
    open: async () => {
      await this.page.click('.header .button.lock.mt-5');
    },
    add: async (tokenName: Currency) => {
      await this.page.click(`#add-${tokenName} button`);
    }
  }

  async swapTokens(swapFromToken: Currency, swapToToken: Currency, transactionAmount: number): Promise<void> {
    if (swapFromToken === swapToToken){
      throw TypeError('You can\'t swap to the same token you are swapping from');
    }

    await this.makeSureTokenIsAdded(swapFromToken);

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
        return;
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
    whatNetwork: async(swapToToken: Currency): Promise<string> =>{
      switch(swapToToken){
      case 'token-vlx2': 
        return 'Velas Legacy';
      case 'token-vlx_native':
        return 'Velas Native';
      case 'token-vlx_evm':
        return 'Velas EVM';
      case 'token-bsc_vlx':
        return 'Binance Smart Chain (VLX BEP20)';
      case 'token-vlx_huobi':
        return 'Huobi ECO Chain (VLX HRC20)';
      case 'token-vlx_erc20':
        return 'Ethereum (VLX ERC20)';        
      default: return 'default'
      }
    },
    chooseDestinationNetwork: async(swapToToken: Currency) => {
      const destinationNetwork = await this.swap.whatNetwork(swapToToken);
      if (destinationNetwork === 'default'){
        return
      }
      let chosenNetwork = await this.page.getAttribute('.change-network', 'value');
      if (chosenNetwork !== destinationNetwork){
        await this.page.click('.network-slider .right');
        chosenNetwork = await this.page.getAttribute('.change-network', 'value');
        const destinationNetowkSelector = `.switch-menu div:text-matches("^ ${destinationNetwork}$")`;
        await this.page.click(destinationNetowkSelector);
        await this.waitForSelectorDisappears('.switch-menu', {timeout: 5000});
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

  async makeSureTokenIsAdded(currency: Currency): Promise <void> {
    await this.waitForWalletsDataLoaded();
    if (!await this.isWalletInWalletsList(currency)){
      await this.addWalletsPopup.open();
      await this.addWalletsPopup.add(currency);
    }
  }
}

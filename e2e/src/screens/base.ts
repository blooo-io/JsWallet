import { Locator } from '@playwright/test';
import { Browser, BrowserContext, Page } from '../common-test-exports';

type MenuItem = 'wallets' | 'staking' | 'search' | 'settings' | 'support' | 'testnet';

export abstract class BaseScreen {
  context: BrowserContext;

  browser: Browser;

  constructor(public page: Page) {
    this.context = this.page.context();
    const browser = this.context.browser();
    if (!browser) throw new Error('Browser was closed');
    this.browser = browser;
  }

  modals = {
    confirmPrompt: async (params?: { timeout?: number }): Promise<void> => {
      await this.page.click('" Confirm"', { timeout: params?.timeout || 10000 });
    },

    clickOK: async (): Promise<void> => {
      await this.page.click('" Ok"');
    },
  };

  async useMax(): Promise<void> {
    await this.page.locator('#send-max').click();
  }

  async isLoggedIn(): Promise<boolean> {
    return await this.page.locator('.right-side .menu-item.bottom').isVisible();
  }

  async openMenu(item: MenuItem): Promise<void> {
    // add new type property to correspond html classname (staking menu item has class "delegate")
    let menuItemName: MenuItem | 'delegate' = item;
    if (item === 'staking') menuItemName = 'delegate';
    await this.page.click(`#menu-${menuItemName}`);
  }

  getElementWhichTextContentContainsWords(wordsList: string[]): Locator {
    let selector = 'text=/';
    wordsList.forEach((word: string) => {
      selector += `(?=.*${word})`;
    });
    selector += '/i';
    // 'text=/(?=.*not)(?=.*valid)(?=.*address)/i'
    return this.page.locator(selector);
  }

  async waitForSelectorDisappears(selector: string, timeout = 5000): Promise<void> {
    let isElementVisible = await this.page.isVisible(selector);
    let totalWaitTime = 0;
    const oneIterationWaitTime = 100;

    while (totalWaitTime < timeout && isElementVisible) {
      await this.page.waitForTimeout(oneIterationWaitTime);
      totalWaitTime += oneIterationWaitTime;
      isElementVisible = await this.page.isVisible(selector);
    }

    if (isElementVisible) throw new Error(`Element with selector "${selector}" has not disappeared in ${totalWaitTime / 1000} seconds`);
  }
}

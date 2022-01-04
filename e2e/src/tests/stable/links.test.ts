import { test } from '@playwright/test';
import { assert } from '../../assert';
import { walletURL } from '../../config';
import { setupPage } from '../../pw-helpers/setup-page';

test.describe('Links', () => {
  test.beforeEach(async ({ page }) => {
    setupPage(page);
    await page.goto(walletURL, { waitUntil: 'networkidle' });
  });

  test('Download links are correct', async ({ page }) => {
    const appleLink = await page.getAttribute('#download-ios', 'href');
    const androidLink = await page.getAttribute('#download-android', 'href');
    assert.isTrue(appleLink?.includes('https://apps.apple.com/'));
    assert.isTrue(androidLink?.includes('https://play.google.com/'));

    await page.click('#download-desktop');
    await page.waitForSelector('.platforms');

    const donwloadLinks = await page.$$('a');
    for (let i = 0; i < donwloadLinks.length; i++) {
      const linkElement = donwloadLinks[i];
      const downloadLink = await linkElement.getAttribute('href');
      assert.isTrue(downloadLink?.includes('https://github.com/velas/JsWalletDesktop'), `${await linkElement.textContent()} doesn't lead to correct destination`);
    }
  });
});

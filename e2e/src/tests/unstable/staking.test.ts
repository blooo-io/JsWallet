import { test } from '@playwright/test';
import { velasNative } from '@velas/velas-chain-test-wrapper';
import { assert } from '../../assert';
import { getWalletURL } from '../../config';
import { setupPage } from '../../pw-helpers/setup-page';
import { Auth } from '../../screens/auth';
import { StakingScreen } from '../../screens/staking';
import { WalletsScreen } from '../../screens/wallets';
import { data } from '../../test-data';
import { helpers } from '../../tools/helpers';

let auth: Auth;
let walletsScreen: WalletsScreen;
let stakingScreen: StakingScreen;

test.describe('Staking >', () => {
  test.beforeEach(async ({ page }) => {
    setupPage(page);
    auth = new Auth(page);
    walletsScreen = new WalletsScreen(page);
    stakingScreen = new StakingScreen(page);
    await page.goto(getWalletURL());
    await auth.loginByRestoringSeed(data.wallets.staking.staker.seed);
    await walletsScreen.openMenu('staking');
  });

  // tests in this suite depend on each other
  test.describe.serial('Actions >', () => {
    const stakingAmount = 5;

    test('Previous run cleanup', async () => {
      await stakingScreen.waitForLoaded();
      await stakingScreen.stakingCleanup.stakesToUndelegate();
      await stakingScreen.stakingCleanup.stakesToWithdraw();
      await stakingScreen.stakingCleanup.stakesNotDelegated();
    });

    test('Use max', async ({ page }) => {
      await stakingScreen.makeSureUiBalanceEqualsChainBalance(data.wallets.staking.staker.publicKey);
      const initialWalletBalance = helpers.toFixed((await velasNative.getBalance(data.wallets.staking.staker.publicKey)).VLX);
      await page.click('" Create Account"');
      await page.click('#send-max');
      const maxAmountString = await page.getAttribute('.input-area input', 'value');
      const maxAmount = helpers.toFixed(Number(maxAmountString?.replace(',', '')));
      assert.equal(maxAmount, initialWalletBalance - 1);
    });

    test('Create staking account', async ({ page }) => {
      const VLXNativeAddress = data.wallets.staking.staker.publicKey;
      const initialAmountOfStakingAccounts = await stakingScreen.getAmountOfStakes('Delegate');
      const stakingAccountAddresses = await stakingScreen.getStakingAccountsAddresses();
      const initialWalletBalance = helpers.toFixed((await velasNative.getBalance(VLXNativeAddress)).VLX);

      await page.click('" Create Account"');
      await page.fill('.input-area input', String(stakingAmount));
      await stakingScreen.confirmPrompt();
      await page.waitForSelector('" Account created and funds deposited"', { timeout: 15000 });
      await page.click('#notification-close');

      // for some reason new stake does not appear in the list immediately
      const finalAmountOfStakingAccounts = await stakingScreen.waitForStakesAmountUpdated(initialAmountOfStakingAccounts, 'Delegate');
      assert.equal(finalAmountOfStakingAccounts, initialAmountOfStakingAccounts + 1);

      const newlyAddedStakingAccountAddress = (await stakingScreen.getStakingAccountsUpdate(stakingAccountAddresses))?.added;
      if (!newlyAddedStakingAccountAddress) throw new Error('No new staking account appears in the list');

      // assert VLXNative balance decreases on staking amount
      const finalWalletBalance = helpers.toFixed((await velasNative.getBalance(VLXNativeAddress)).VLX);
      assert.equal(finalWalletBalance, initialWalletBalance - stakingAmount);

      // check newly created staking account on blockchain
      await stakingScreen.makeSureStakingAccIsCreatedAndNotDelegated(newlyAddedStakingAccountAddress);
      assert.equal(helpers.toFixed((await velasNative.getBalance(newlyAddedStakingAccountAddress)).VLX), stakingAmount);
    });

    test('Delegate stake', async ({ page }) => {
      const initialAmountOfDelegatedStakes = await stakingScreen.getAmountOfStakes('Undelegate');
      const stakeAccountAddress = await stakingScreen.getFirstStakingAccountAddressFromTheList('Delegate');

      await stakingScreen.clickDelegate();
      assert.isFalse(await page.isVisible('#choosen-pull'));
      await page.click('.staking-content.delegate button');
      await page.click('#choosen-pull button span:text(" Apply")');
      const alertText = await (await page.waitForSelector('.confirmation .text', { timeout: 10000 })).textContent();
      assert.include(alertText, 'Funds delegated to');
      await page.click('" Ok"');
      const finalAmountOfDelegatedStakes = await stakingScreen.waitForStakesAmountUpdated(initialAmountOfDelegatedStakes, 'Undelegate');
      assert.equal(finalAmountOfDelegatedStakes, initialAmountOfDelegatedStakes + 1);

      const stakeAccOnBlockchain = await velasNative.getStakeAccount(stakeAccountAddress);
      assert.equal(stakeAccOnBlockchain.active, 0);
      assert.equal(stakeAccOnBlockchain.inactive, stakingAmount * 10 ** 9);
      assert.equal(stakeAccOnBlockchain.state, 'activating');
    });

    test('Undelegate stake', async ({ page }) => {
      const initialToUndelegateStakesAmount = await stakingScreen.getAmountOfStakes('Undelegate');
      const initialToDelegateStakesAmount = await stakingScreen.getAmountOfStakes('Delegate');
      const stakeAccountAddress = await stakingScreen.getFirstStakingAccountAddressFromTheList('Delegate');

      await stakingScreen.clickUndelegate();
      await page.click('" Confirm"');
      await page.waitForSelector('" Funds undelegated successfully"', { timeout: 10000 });
      await page.click('" Ok"');
      const finalToUndelegateStakesAmount = await stakingScreen.waitForStakesAmountUpdated(initialToUndelegateStakesAmount, 'Undelegate');
      assert.equal(finalToUndelegateStakesAmount, initialToUndelegateStakesAmount - 1, 'Amount of stakes to undelegate has not changed after undelegation');
      assert.equal(await stakingScreen.getAmountOfStakes('Delegate'), initialToDelegateStakesAmount + 1, 'Amount of stakes to withdraw has not changed after undelegation');

      const stakeAccOnBlockchain = await velasNative.getStakeAccount(stakeAccountAddress);
      assert.equal(stakeAccOnBlockchain.active, 0);
      assert.equal(stakeAccOnBlockchain.inactive, stakingAmount * 10 ** 9);
      assert.equal(stakeAccOnBlockchain.state, 'inactive');
    });

    test('Split stake', async ({ page }) => {
      const initialAmountOfStakingAccounts = await stakingScreen.getAmountOfStakes('Delegate');
      const stakingAccountAddresses = await stakingScreen.getStakingAccountsAddresses();

      await stakingScreen.selectAccount('Delegate');
      await page.click('button.action-split');
      await page.fill('.input-area input', '1');
      await page.click('#prompt-confirm');
      await page.waitForSelector('" Account created and funds are splitted successfully"', { timeout: 20000 });
      await page.click('#notification-close')

      const finalAmountOfStakingAccounts = await stakingScreen.waitForStakesAmountUpdated(initialAmountOfStakingAccounts, 'Delegate');
      assert.equal(finalAmountOfStakingAccounts, initialAmountOfStakingAccounts + 1);

      // postcondition – withdraw splitted account
      const addedAfterSplitAccountAddress = (await stakingScreen.getStakingAccountsUpdate(stakingAccountAddresses))?.added;
      if (!addedAfterSplitAccountAddress) throw new Error('No staking accounts appears. But it was expected after staking');
      // await stakingScreen.selectAccount('Delegate');
      await stakingScreen.selectAccountByAddress(addedAfterSplitAccountAddress);
      await page.click('button span:text(" Withdraw")');
      await page.click('" Confirm"');
      await page.waitForSelector('" Funds withdrawn successfully"', { timeout: 20000 });
      await page.click('" Ok"');
    });

    test('Withdraw stake', async ({ page }) => {
      const stakingAccountAddresses = await stakingScreen.getStakingAccountsAddresses();
      const initialAmountOfStakingAccounts = await stakingScreen.getAmountOfStakes('all');
      const stakeAccountAddress = await stakingScreen.getFirstStakingAccountAddressFromTheList('Delegate');

      await stakingScreen.selectAccount('Delegate');
      await page.click('button span:text(" Withdraw")');
      await page.click('" Confirm"');
      await page.waitForSelector('" Funds withdrawn successfully"', { timeout: 30000 });
      await page.click('" Ok"');
      const finalAmountOfStakingAccounts = await stakingScreen.waitForStakesAmountUpdated(initialAmountOfStakingAccounts, 'all');

      assert.equal(finalAmountOfStakingAccounts, initialAmountOfStakingAccounts - 1);

      await stakingScreen.makeSureStakingAccountDoesNotExist(stakeAccountAddress);
      const withdrawedStakeAccountAddress = (await stakingScreen.getStakingAccountsUpdate(stakingAccountAddresses))?.removed;
      if (!withdrawedStakeAccountAddress) throw new Error(`Withdwed stake ${stakingAccountAddresses} does not disappear from stakes list`);
      assert.equal(withdrawedStakeAccountAddress, stakeAccountAddress);
    });

    test('Validators list', async ({ page }) => {
      await stakingScreen.waitForLoaded();
      await page.waitForSelector('.validator-item .identicon', { timeout: 10000 });
      assert.isTrue(await page.isVisible('.validator-item .identicon'), 'No validator icon in validators list');
      assert.isTrue(await page.isVisible('.validator-item .browse'), 'No icon with link to explorer in validators list');
      assert.isTrue(await page.isVisible('.validator-item .copy'), 'No copy address icon in validators list');
      assert.isTrue(await page.isVisible('.validator-item .with-stake'), 'No my-stake column in validators list');
    });
  });
});

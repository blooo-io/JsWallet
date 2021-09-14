import { test } from '@playwright/test';
import { velasNative } from '@velas/velas-chain-test-wrapper';
import { assert } from '../../assert';
import { getWalletURL } from '../../config';
import { setupPage } from '../../pw-helpers/setup-page';
import { Auth } from '../../screens/auth';
import { StakingScreen } from '../../screens/staking';
import { WalletsScreen } from '../../screens/wallets';
import { data } from '../../test-data';

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

  test.describe('Actions >', () => {
    // tests in this suite depend on each other

    const stakingAmount = 5;

    test('Create staking account', async ({ page }) => {
      // const stakingAccountAddressesList = await stakingScreen.getStakingAccountsAddresses();
      // if (stakingAccountAddressesList.length) throw new Error(`This test suite cannot be passed because staking accounts list should be empty.
      // Please delete all staking accounts for account with seed "${data.wallets.staking.staker.seed}"`);
      // TODO: implement auto deletion

      const VLXNativeAddress = '59vpQgPoDEhux1G84jk6dbbARQqfUwYtohLU4fgdxFKG';
      const initialAmountOfStakingAccounts = await stakingScreen.getAmountOfStakes('Delegate');
      const stakingAccountAddresses = await stakingScreen.getStakingAccountsAddresses();
      const initialWalletBalance = Number((await velasNative.getBalance(VLXNativeAddress)).VLX.toFixed(0));

      await page.click('" Create Account"');
      await page.fill('.input-area input', String(stakingAmount));
      await stakingScreen.confirmPrompt();
      await page.waitForSelector('" Account created and funds deposited"', { timeout: 10000 });
      await page.click('#notification-close');

      // for some reason new stake does not appear in the list immediately
      const finalAmountOfStakingAccounts = await stakingScreen.waitForStakesAmountUpdated(initialAmountOfStakingAccounts, 'Delegate');
      assert.equal(finalAmountOfStakingAccounts, initialAmountOfStakingAccounts + 1);

      const newlyAddedStakingAccountAddress = (await stakingScreen.getStakingAccountsUpdate(stakingAccountAddresses))?.added;
      if (!newlyAddedStakingAccountAddress) throw new Error('No new staking account appears in the list');

      // assert VLXNative balance decreases on staking amount
      const finalWalletBalance = Number((await velasNative.getBalance(VLXNativeAddress)).VLX.toFixed(0));
      assert.equal(finalWalletBalance, initialWalletBalance - stakingAmount);

      // check newly created staking account on blockchain
      await stakingScreen.makeSureStakingAccIsCreatedAndNotDelegated(newlyAddedStakingAccountAddress);
      assert.equal((await velasNative.getBalance(newlyAddedStakingAccountAddress)).VLX.toFixed(0), String(stakingAmount));
    });

    test('Use max', async ({ page }) => {
      const initialWalletBalance = Number((await velasNative.getBalance('59vpQgPoDEhux1G84jk6dbbARQqfUwYtohLU4fgdxFKG')).VLX.toFixed(0));

      // balace used in 'use max' is not updated automatically, remove after bug-fix VLWA-552
      await walletsScreen.refresh();
      await page.waitForSelector('.amount:not(.placeholder)');

      await page.click('" Create Account"');
      await page.click('#send-max');
      const maxAmount = await page.getAttribute('.input-area input', 'value');
      assert.equal(Number(maxAmount?.replace(',', '')), initialWalletBalance - 1);
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
      await page.waitForSelector('" Funds undelegated successfully"');
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
      await page.waitForSelector('" Account created and funds are splitted successfully"');
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
      await page.waitForSelector('" Funds withdrawn successfully"');
      await page.click('" Ok"');
    });

    test('Withdraw stake', async ({ page }) => {
      const stakingAccountAddresses = await stakingScreen.getStakingAccountsAddresses();
      const initialAmountOfStakingAccounts = await stakingScreen.getAmountOfStakes('all');
      const stakeAccountAddress = await stakingScreen.getFirstStakingAccountAddressFromTheList('Delegate');

      await stakingScreen.selectAccount('Delegate');
      await page.click('button span:text(" Withdraw")');
      await page.click('" Confirm"');
      await page.waitForSelector('" Funds withdrawn successfully"');
      await page.click('" Ok"');
      const finalAmountOfStakingAccounts = await stakingScreen.waitForStakesAmountUpdated(initialAmountOfStakingAccounts, 'all');

      assert.equal(finalAmountOfStakingAccounts, initialAmountOfStakingAccounts - 1);

      await stakingScreen.makeSureStakingAccountDoesNotExist(stakeAccountAddress);
      const withdrawedStakeAccountAddress = (await stakingScreen.getStakingAccountsUpdate(stakingAccountAddresses))?.removed;
      assert.equal(withdrawedStakeAccountAddress, stakeAccountAddress);
    });

    test('Validators list', async ({ page }) => {
      await stakingScreen.waitForLoaded();
      assert.isTrue(await page.isVisible('.validator-item .identicon'), 'No validator icon in validators list');
      assert.isTrue(await page.isVisible('.validator-item .browse'), 'No icon with link to explorer in validators list');
      assert.isTrue(await page.isVisible('.validator-item .copy'), 'No copy address icon in validators list');
      assert.isTrue(await page.isVisible('.validator-item .with-stake'), 'No my-stake column in validators list');
    });
  });
});

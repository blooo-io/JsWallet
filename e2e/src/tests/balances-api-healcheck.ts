import balancesAPI from '../api/balances-api';

(async () => {
  await balancesAPI.bitcore();
  await balancesAPI.apiVelasCom();
  await balancesAPI.explorer();
  await balancesAPI.infura();
  await balancesAPI.evmExplorer();
})();

import { data } from './test-data';
import { Environment } from './types';

const environment: Environment = 'local';
type Network = 'testnet' | 'mainnet';

export const config = {
  defaultWaitTimeout: Number(process.env.DEFAULT_WAIT_TIMEOUT) || 6000,
  env: process.env.ENVIRONMENT as Environment || environment,
  logLevel: process.env.LOG_LEVEL || 'warn',
  CI: process.env.CI === 'false',
  retries: process.env.CI ? 1 : 0,
  pw: {
    slowMo: 100,
  },
};

export function getWalletURL(params?: { network?: Network, environment?: Environment }): string {
  // default environment used – "local"
  const url = data.walletURLs[params?.environment || 'local'];
  // default network used – "testnet"
  return (!params?.network || params?.network === 'testnet') ? `${url}?network=testnet` : url;
}

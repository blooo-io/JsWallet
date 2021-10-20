import { data } from './test-data';
import { Environment } from './types';

const environment: Environment = 'local';
type Network = 'testnet' | 'mainnet';

export const config = {
  CI: process.env.CI === 'true',
  defaultWaitTimeout: Number(process.env.DEFAULT_WAIT_TIMEOUT) || 6000,
  environment: process.env.ENVIRONMENT as Environment || environment,
  logLevel: process.env.LOG_LEVEL || 'debug',
  network: process.env.NETWORK || 'testnet',
  pw: {
    slowMo: 250,
  },
};

export function getWalletURL(params?: { network?: Network, environment?: Environment }): string {
  // default environment used – "local"
  const url = data.walletURLs[params?.environment || config.environment];
  // default network used – "testnet"
  return (!params?.network || params?.network === config.network) ? `${url}?network=testnet` : url;
}

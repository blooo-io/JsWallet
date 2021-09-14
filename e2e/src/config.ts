import { data } from './test-data';
import { Environment } from './types';

const environment: Environment = 'local';
type Network = 'testnet' | 'mainnet';

export const config = {
  CI: process.env.CI === 'false',
  defaultWaitTimeout: Number(process.env.DEFAULT_WAIT_TIMEOUT) || 6000,
  environment: process.env.ENVIRONMENT as Environment || environment,
  logLevel: process.env.LOG_LEVEL || 'info',
  network: process.env.NETWORK || 'testnet',
  pw: {
    slowMo: 200,
  },
};

export function getWalletURL(params?: { network?: Network, environment?: Environment }): string {
  // default environment used – "local"
  const url = data.walletURLs[params?.environment || config.environment];
  // default network used – "testnet"
  return (!params?.network || params?.network === config.network) ? `${url}?network=testnet` : url;
}

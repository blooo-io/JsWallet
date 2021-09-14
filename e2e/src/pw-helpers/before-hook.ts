import { config } from '../config';
import { log } from '../tools/logger';

export default () => {
  log.info(`Tests are running ${process.env.CI ? 'on CI' : 'locally'} on ${config.environment} URL using ${config.network} network`);
};

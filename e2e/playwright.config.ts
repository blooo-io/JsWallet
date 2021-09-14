import { PlaywrightTestConfig } from '@playwright/test';
import { config as globalConfig } from './src/config';

const windowSize = { width: 1900, height: 1080 };

const config: PlaywrightTestConfig = {
  globalSetup: 'src/pw-helpers/before-hook.ts',
  // globalTeardown: '',
  maxFailures: globalConfig.CI ? 10 : 1,
  retries: globalConfig.retries,
  timeout: 120000,
  workers: 1,
  // reporter: 'list',
  // repeatEach: 5,
  reporter: [['list'], ['junit', { outputFile: 'test-results/test-results.xml' }]],
  projects: [
    {
      name: 'Chrome Stable',
      use: {
        browserName: 'chromium',
        channel: 'chrome',
        headless: globalConfig.CI,
        launchOptions: {
          args: ['--disable-dev-shm-usage', '--disable-gpu', '--no-sandbox', `--window-size=${windowSize.width},${windowSize.height}`, '--disable-features=TranslateUI'],
          devtools: false,
          slowMo: globalConfig.pw.slowMo,
        },
        screenshot: 'only-on-failure',
        viewport: { width: 1900, height: 1080 },
        video: {
          mode: 'retain-on-failure',
          size: {
            width: 1920,
            height: 1080,
          },
        },
      },
      // testDir: '',
    },
    // {
    //   name: 'Desktop Safari',
    //   use: {
    //     browserName: 'webkit',
    //     viewport: { width: 1920, height: 1080 },
    //   }
    // },
    // Test against mobile viewports.
    // {
    //   name: 'Mobile Chrome',
    //   use: devices['Pixel 5'],
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: devices['iPhone 12'],
    // },
    // {
    //   name: 'Desktop Firefox',
    //   use: {
    //     browserName: 'firefox',
    //     viewport: { width: 1920, height: 1080 },
    //   }
    // },
  ],
};

export default config;

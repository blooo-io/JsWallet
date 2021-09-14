### Prepare
Install **expo** globally
`npm i expo-cli -g`

Install **junit2html**
`sudo pip3 install junit2html` or `sudo pip install junit2html`

Install required browsers
`npx playwright install chrome`

Install modules
`npm i`

### Configuration
Refer to `config.ts` file

### Run tests
`npx playwright test <path>`
e.g. `npx playwright test src/tests/auth.test.ts`

Run all tests:
`npx playwright test`

Before running tests locally, build and run wallet: `npm run wallet-start`.

### Debug
#### Enabling debug window
Add PWDEBUG=1 before your test script, e.g.
`PWDEBUG=1 npx playwright test`

#### Enable playwright logs
`DEBUG=pw:api`

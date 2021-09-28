import { config } from "../config";
import { data } from "../test-data";

export const helpers = {
  getArraysDiff: (a1: any[], a2: any[]) => {
    const a: any[] = []; const diff = [];

    for (let i = 0; i < a1.length; i++) {
      a[a1[i]] = true;
    }

    for (let i = 0; i < a2.length; i++) {
      if (a[a2[i]]) {
        delete a[a2[i]];
      } else {
        a[a2[i]] = true;
      }
    }

    for (const k in a) {
      diff.push(k);
    }

    return diff;
  },

  getWalletURL(params: { testnet: boolean } = { testnet: false }, { env: Env } = { env: config.environment }) {
    const url = data.walletURLs[Env];
    return params.testnet ? `${url}?network=testnet` : url;
  },

  toFixed(number: Number, fractionDigits: Number = 0) {
    const re = new RegExp('^-?\\d+(?:\.\\d{0,' + (fractionDigits || -1) + '})?');
    const fixedNumber = Number(number.toString().match(re));
    if(!fixedNumber) throw new Error ('Failed to trim decimal\'s fractional part')
    return fixedNumber;
  }
};

import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class TrustaService {
  graphqlProUrl = 'https://graph-node-api.izumi.finance/query/subgraphs/name/izi-swap-map';
  graphqlV3Url = 'https://graph.mapprotocol.io/subgraphs/name/hiveswap/exchange-v3-test';
  graphqlV2Url = 'https://makalu-graph.maplabs.io/subgraphs/name/map/hiveswap2';

  async getLPRecordsPro(httpService: HttpService) {
    const pageSize = 1000;
    let round = 1;
    let flag = true;
    const res = new Map();
    while (flag) {
      const data = `query MyQuery {
        mints (first: ${pageSize}, skip: ${(round - 1) * pageSize}, orderDirection: asc, orderBy: timestamp) {
          amountUSD
          account
        }
      }`;

      const response = await httpService.axiosRef.post(this.graphqlProUrl, {
        operationName: 'MyQuery',
        query: data,
      });
      const mints: { account: string; amountUSD: string }[] = response.data.data.mints;
      mints.forEach((record) => {
        const before = res.get(record.account) ?? 0;
        res.set(record.account.toLowerCase(), before + Number(record.amountUSD));
      });
      if (mints.length < pageSize) {
        flag = false;
      }
      round++;
    }

    return res;
  }

  async getLPRecordsV3(httpService: HttpService) {
    const pageSize = 1000;
    let round = 1;
    let flag = true;
    const res = new Map();
    while (flag) {
      const data = `query MyQuery {
        mints (first: ${pageSize}, skip: ${(round - 1) * pageSize}, orderDirection: asc, orderBy: timestamp) {
          amountUSD
          origin
        }
      }`;

      const response = await httpService.axiosRef.post(this.graphqlV3Url, {
        operationName: 'MyQuery',
        query: data,
      });
      const mints: { origin: string; amountUSD: string }[] = response.data.data.mints;
      mints.forEach((record) => {
        const before = res.get(record.origin) ?? 0;
        res.set(record.origin.toLowerCase(), before + Number(record.amountUSD));
      });
      if (mints.length < pageSize) {
        flag = false;
      }
      round++;
    }

    return res;
  }

  async getLPRecordsV2(httpService: HttpService) {
    const pageSize = 1000;
    let round = 1;
    let flag = true;
    const res = new Map();
    while (flag) {
      const data = `query MyQuery {
        mints (first: ${pageSize}, skip: ${(round - 1) * pageSize}, orderDirection: asc, orderBy: timestamp) {
          amountUSD
          to
        }
      }`;

      const response = await httpService.axiosRef.post(this.graphqlV2Url, {
        operationName: 'MyQuery',
        query: data,
      });
      const mints: { to: string; amountUSD: string }[] = response.data.data.mints;
      mints.forEach((record) => {
        const before = res.get(record.to) ?? 0;
        res.set(record.to.toLowerCase(), before + Number(record.amountUSD));
      });
      if (mints.length < pageSize) {
        flag = false;
      }
      round++;
    }

    return res;
  }
}

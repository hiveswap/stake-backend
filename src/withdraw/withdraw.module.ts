import * as GateApi from 'gate-api';

export class WithdrawModule {
  client: GateApi.ApiClient;
  constructor(apiKey: string, apiSecret: string) {
    this.client = new GateApi.ApiClient();
    this.client.setApiKeySecret(apiKey, apiSecret);
  }

  async withdraw(param: GateApi.LedgerRecord) {
    const api = new GateApi.WithdrawalApi(this.client);
    const resp = await api.withdraw(param);
    if (resp.body.status === GateApi.LedgerRecord.Status.FAIL || resp.body.status === GateApi.LedgerRecord.Status.INVALID) {
      throw new Error(`status error: ${resp.body.status}`);
    }
    return resp.body;
  }
}

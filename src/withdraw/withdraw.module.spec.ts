import { WithdrawModule } from './withdraw.module';
import * as GateApi from 'gate-api';

describe('WithdrawModule', () => {
  let module: WithdrawModule;

  beforeAll(async () => {
    const apiKey = '';
    const apiSecret = '';
    module = new WithdrawModule(apiKey, apiSecret);
  });

  it('should be defined', async () => {
    const param = new GateApi.LedgerRecord();
    param.amount = '10';
    param.currency = 'usdt';
    param.address = '';
    param.chain = '';
    try {
      await module.withdraw(param);
    } catch (err) {
      expect(err.message).toBe('Request failed with status code 401');
    }
  });
});

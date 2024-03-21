import { retry } from './retry';

describe('Retry Spec', () => {
  describe('test retry function', () => {
    it('should exec correct', async () => {
      const fn = async (input: number): Promise<number> => {
        return new Promise<number>((resolve) => {
          resolve(input ** 2);
        });
      };
      const res = await retry(fn, 3, 1000, this, 12);

      expect(res).toBe(12 ** 2);
    });

    it('should exec correct after retry once', async () => {
      let flag = false;
      let retryCnt = 0;
      const fn = async (input: number): Promise<number> => {
        return new Promise<number>((resolve, reject) => {
          if (flag) {
            resolve(input ** 2);
          } else {
            retryCnt++;
            flag = true;
            reject('normal exit');
          }
        });
      };
      const res = await retry(fn, 3, 1000, this, 12);
      expect(retryCnt).toBe(1);
      expect(res).toBe(12 ** 2);
    });
  });
});

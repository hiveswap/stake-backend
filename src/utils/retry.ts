import { Logger } from '@nestjs/common';

type Func<T extends any[], U> = (...input: T) => Promise<U>;

export async function retry<T extends any[], U>(
  func: Func<T, U>,
  retryTimes = 1000,
  retryInterval = 1000,
  context: any,
  ...args: T
): Promise<U> {
  try {
    const result = await func.apply(context, args);
    return result as U;
  } catch (error) {
    if (retryTimes > 0) {
      await new Promise((resolve) => setTimeout(resolve, retryInterval));
      Logger.warn(
        `retry(${func.name}) err, will retry ${retryTimes} times`,
        'Retry',
      );
      return retry(func, retryTimes - 1, retryInterval, context, ...args);
    } else {
      throw error;
    }
  }
}

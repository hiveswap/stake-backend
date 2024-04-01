import BigNumber from 'bignumber.js';

export const poolMap: Map<string, { tokenX: { address: string; symbol: string }; tokenY: { address: string; symbol: string } }> = new Map([
  [
    '0x3ddc9de7a05149c9aa40df3318a55f567de02173',
    {
      tokenX: {
        address: '0x13cb04d4a5dfb6398fc5ab005a6c84337256ee23',
        symbol: 'WMAP',
      },
      tokenY: {
        address: '0x33daba9618a75a7aff103e53afe530fbacf4a3dd',
        symbol: 'USDT',
      },
    },
  ],
  [
    '0x9a9a54da258cc872dd61a52c130540c9e256c314',
    {
      tokenX: {
        address: '0x05ab928d446d8ce6761e368c8e7be03c3168a9ec',
        symbol: 'ETH',
      },
      tokenY: {
        address: '0x13cb04d4a5dfb6398fc5ab005a6c84337256ee23',
        symbol: 'WMAP',
      },
    },
  ],
  [
    '0xeea5b6e4863f59cc72370bd6bf329be5f25b438d',
    {
      tokenX: {
        address: '0x13cb04d4a5dfb6398fc5ab005a6c84337256ee23',
        symbol: 'WMAP',
      },
      tokenY: {
        address: '0x33daba9618a75a7aff103e53afe530fbacf4a3dd',
        symbol: 'USDT',
      },
    },
  ],
]);

export const tokenAddrToPrice: Map<string, BigNumber> = new Map([
  // WMAP
  ['0x13cb04d4a5dfb6398fc5ab005a6c84337256ee23', new BigNumber(0.034)],
  // USDT
  ['0x33daba9618a75a7aff103e53afe530fbacf4a3dd', new BigNumber(1)],
  // ETH
  ['0x05ab928d446d8ce6761e368c8e7be03c3168a9ec', new BigNumber(3543.96)],
]);

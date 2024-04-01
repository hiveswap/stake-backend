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
  // stMAPO
  ['0x9bd1e0a3a727d0d4f4e9a6d59022e071ddc79924', new BigNumber(0.034)],
  // LSGS
  ['0x756af1d3810a01d3292fad62f295bbcc6c200aea', new BigNumber(0.0001584)],
  // BTC
  ['0xb877E3562a660C7861117c2f1361A26ABaF19bEB', new BigNumber(70234)],
  // M-BTC
  ['0x1d22c0ab633f393c84a98cf4f2fad10ba47bb7b3', new BigNumber(70234)],
  // ROUP
  ['0x5a1c3f3aaE616146C7b9bf9763E0ABA9bAFc5eaE', new BigNumber(0.0028332)],
  // SolvBTC
  ['0x7eB8B1fE3EE3287FD5864e50f32322ce3285b39D', new BigNumber(70234)],
  // iUSD
  ['0x61899CE1396FF351e5fdb9c8AD36FeE9411c73c2', new BigNumber(1)],
  // STST
  ['0xf5a59f961a8e86285dae2e45ac4ae50e4e47ba97', new BigNumber(1)],
]);

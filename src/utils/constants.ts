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
  [
    '0xf14462d71b579d19c47f4e0eaf2c50c641be40b6',
    {
      tokenX: {
        address: '0x1d22c0ab633f393c84a98cf4f2fad10ba47bb7b3',
        symbol: 'M-BTC',
      },
      tokenY: {
        address: '0xb877e3562a660c7861117c2f1361a26abaf19beb',
        symbol: 'BTC',
      },
    },
  ],
  [
    '0x68f6898102dc74adf1bc0078fbe6447fb1b7f419',
    {
      tokenX: {
        address: '0x13cb04d4a5dfb6398fc5ab005a6c84337256ee23',
        symbol: 'MAPO',
      },
      tokenY: {
        address: '0x756af1d3810a01d3292fad62f295bbcc6c200aea',
        symbol: 'LSGS',
      },
    },
  ],
  [
    '0x195e585f06121eb1af2d70b8a2e7346b0483c155',
    {
      tokenX: {
        address: '0x13cb04d4a5dfb6398fc5ab005a6c84337256ee23',
        symbol: 'MAPO',
      },
      tokenY: {
        address: '0x9bd1e0a3a727d0d4f4e9a6d59022e071ddc79924',
        symbol: 'stMAPO',
      },
    },
  ],
  // [
  //   '0x4b8d6d8e541e3711ed4b47ac44254c302d6d4c54',
  //   {
  //     tokenX: {
  //       address: '0x13cb04d4a5dfb6398fc5ab005a6c84337256ee23',
  //       symbol: 'MAPO',
  //     },
  //     tokenY: {
  //       address: '0x3e76def74d4187b5a01abe4e011bd94d9f057d94',
  //       symbol: 'ROUP',
  //     },
  //   },
  // ],
  [
    '0xd2f5960b1dc80b056248738b1a52bd978d6371db',
    {
      tokenX: {
        address: '0x13cb04d4a5dfb6398fc5ab005a6c84337256ee23',
        symbol: 'MAPO',
      },
      tokenY: {
        address: '0xf5a59f961a8e86285dae2e45ac4ae50e4e47ba97',
        symbol: 'STST',
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
  ['0xb877e3562a660c7861117c2f1361a26abaf19beb', new BigNumber(70234)],
  // M-BTC
  ['0x1d22c0ab633f393c84a98cf4f2fad10ba47bb7b3', new BigNumber(70234)],
  // ROUP
  // ['0x5a1c3f3aaE616146C7b9bf9763E0ABA9bAFc5eaE', new BigNumber(0.0028332)],
  // SolvBTC
  ['0x7eb8b1fe3ee3287fd5864e50f32322ce3285b39d', new BigNumber(70234)],
  // iUSD
  ['0x61899ce1396ff351e5fdb9c8ad36fee9411c73c2', new BigNumber(1)],
  // STST
  ['0xf5a59f961a8e86285dae2e45ac4ae50e4e47ba97', new BigNumber(0.00002)],
]);

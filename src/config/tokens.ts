import BigNumber from 'bignumber.js';

export const Tokens = {
  WMAPO: { address: '0x13cb04d4a5dfb6398fc5ab005a6c84337256ee23', symbol: 'WMAPO' },
  BTC: { address: '0xb877e3562a660c7861117c2f1361a26abaf19beb', symbol: 'BTC' },
  MBTC: { address: '0x1d22c0ab633f393c84a98cf4f2fad10ba47bb7b3', symbol: 'M-BTC' },
  SolvBTC: { address: '0x7eb8b1fe3ee3287fd5864e50f32322ce3285b39d', symbol: 'SolvBTC' },
  USDT: { address: '0x33daba9618a75a7aff103e53afe530fbacf4a3dd', symbol: 'USDT' },
  iUSD: { address: '0x61899ce1396ff351e5fdb9c8ad36fee9411c73c2', symbol: 'iUSD' },
  ETH: { address: '0x05ab928d446d8ce6761e368c8e7be03c3168a9ec', symbol: 'ETH' },
  LSGS: { address: '0x756af1d3810a01d3292fad62f295bbcc6c200aea', symbol: 'LSGS' },
  STMAPO: { address: '0x9bd1e0a3a727d0d4f4e9a6d59022e071ddc79924', symbol: 'stMAPO' },
  STST: { address: '0xf5a59f961a8e86285dae2e45ac4ae50e4e47ba97', symbol: 'STST' },
  ROUP: { address: '0x5a1c3f3aae616146c7b9bf9763e0aba9bafc5eae', symbol: 'ROUP' },
  FOX2: { address: '0x1ddecb7126028ea347408edef9d218f74b226d22', symbol: 'FOX2' },
  EEAA: { address: '0x040a66ed7def1c037c5c9848bc5d44dcd3b0fc62', symbol: 'EEAA' },
  MERL: { address: '0xbe5331d2c6fbf1799ac3bff6f7cc606cefb816d8', symbol: 'MERL' },
  MP: { address: '0x8e5b2e876243c7aC1922C6a19a9d6F6603408019', symbol: 'MP' },
  MSTAR: { address: '0x9735452EAccc7a137742777AEAB595b0dEccaf36', symbol: 'MSTAR' },
  MIRK: { address: '0x8dfaad2ecd2a46e892a1f5b76ba5a0571014abfd', symbol: 'MIRK' },
};

export const poolMap: Map<string, { tokenX: { address: string; symbol: string }; tokenY: { address: string; symbol: string } }> = new Map([
  ['0x4c51033b68b63cc28ce4039299be33c239508be7', { tokenX: Tokens.WMAPO, tokenY: Tokens.BTC }],
  ['0xf14462d71b579d19c47f4e0eaf2c50c641be40b6', { tokenX: Tokens.MBTC, tokenY: Tokens.BTC }],
  ['0x44a89ecc5ef3485df877b5a3686001978e89745d', { tokenX: Tokens.MBTC, tokenY: Tokens.SolvBTC }],
  ['0xab72822e679da3297364b88f7a36563111cff4de', { tokenX: Tokens.MBTC, tokenY: Tokens.SolvBTC }],
  ['0xf75be539716f114c5fe99a2d4e79225018fe1169', { tokenX: Tokens.USDT, tokenY: Tokens.SolvBTC }],
  ['0x5abbbeb8ed71f4760f3558abdec9214f53907ddf', { tokenX: Tokens.WMAPO, tokenY: Tokens.SolvBTC }],
  ['0xa75856d47ee7fc8b45eaaf78aaefbf74acbdfe7e', { tokenX: Tokens.USDT, tokenY: Tokens.iUSD }],
  ['0x9a9a54da258cc872dd61a52c130540c9e256c314', { tokenX: Tokens.ETH, tokenY: Tokens.WMAPO }],
  ['0x3ddc9de7a05149c9aa40df3318a55f567de02173', { tokenX: Tokens.WMAPO, tokenY: Tokens.USDT }],
  ['0x195e585f06121eb1af2d70b8a2e7346b0483c155', { tokenX: Tokens.WMAPO, tokenY: Tokens.STMAPO }],
  ['0x4b8d6d8e541e3711ed4b47ac44254c302d6d4c54', { tokenX: Tokens.WMAPO, tokenY: Tokens.ROUP }],
  ['0xd2f5960b1dc80b056248738b1a52bd978d6371db', { tokenX: Tokens.WMAPO, tokenY: Tokens.STST }],
  ['0x68f6898102dc74adf1bc0078fbe6447fb1b7f419', { tokenX: Tokens.WMAPO, tokenY: Tokens.LSGS }],
]);

export const newPoolMap: Map<string, { tokenX: { address: string; symbol: string }; tokenY: { address: string; symbol: string } }> =
  new Map([
    ...poolMap,
    ['0xfd12ba2bb838886743b1b7fd287909ee11541e31', { tokenX: Tokens.WMAPO, tokenY: Tokens.FOX2 }],
    ['0x1e468938d516b934aacdbe503e2afd5c5a1b8490', { tokenX: Tokens.EEAA, tokenY: Tokens.WMAPO }],
    ['0x65058680e027b15d8c11c8ebc68e98745af3de9b', { tokenX: Tokens.WMAPO, tokenY: Tokens.MIRK }],
  ]);

export const tokenAddrToPrice: Map<string, BigNumber> = new Map([
  [Tokens.WMAPO.address, new BigNumber(0.031)],
  [Tokens.BTC.address, new BigNumber(66611)],
  [Tokens.MBTC.address, new BigNumber(66611)],
  [Tokens.SolvBTC.address, new BigNumber(66611)],
  [Tokens.USDT.address, new BigNumber(1)],
  [Tokens.iUSD.address, new BigNumber(1)],
  [Tokens.ETH.address, new BigNumber(3543.96)],
  [Tokens.STMAPO.address, new BigNumber(0.031)],
  [Tokens.ROUP.address, new BigNumber(0.0023332)],
  [Tokens.STST.address, new BigNumber(0.05495)],
  [Tokens.LSGS.address, new BigNumber(0.000151)],
  [Tokens.FOX2.address, new BigNumber(0.02532)],
  [Tokens.EEAA.address, new BigNumber(0.000134)],
  [Tokens.MERL.address, new BigNumber(1.3)],
  [Tokens.MIRK.address, new BigNumber(0.048)],
]);

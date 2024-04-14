import BigNumber from 'bignumber.js';
import { Tokens } from './tokens';

export const P_POINT_PER_HOUR = 12500; // 300000 / 24

export const P_POINT_EPOLL_START_TIME = 1712145733;

export const START_BLOCK_NUMBER = 0;

export const START_SYNC_BRIDGE_BLOCK_NUMBER = 11044351;

export const BRIDGE_POINT_PER_DOLLAR = new BigNumber(0.04);

export const SUPPORTED_BRIDGE_TOKENS = [Tokens.BTC.address, Tokens.MBTC.address, Tokens.SolvBTC.address, Tokens.iUSD.address];

// the pending one side stake time stamp
export const NEW_RULE_VALID_TIME = 1713132000;

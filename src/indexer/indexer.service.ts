import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Contract, EventFragment, FetchRequest, JsonRpcProvider, Result, Wallet } from 'ethers';
import { liquidityAbi } from '../resources/contract/abi';
import { retry } from '../utils/retry';
import { AddLiquidityEvent, BridgeEvent, Prisma, PrismaPromise, RemoveLiquidityEvent } from '@prisma/client';
import { HttpsProxyAgent } from 'https-proxy-agent';
import configurations from '../config/configurations';
import { DateTime } from 'luxon';
import { newPoolMap, poolMap, Tokens } from 'src/config/tokens';
import {
  BRIDGE_POINT_PER_DOLLAR,
  NEW_POOL_BLOCK,
  START_BLOCK_NUMBER,
  START_SYNC_BRIDGE_BLOCK_NUMBER,
  SUPPORTED_BRIDGE_TOKENS,
} from '../config/config';
import { BridgeABI } from '../resources/abis/bridge';
import { prices } from '../config/price';
import { BRIDGE_ADDRESS } from '../config/contracts';

@Injectable()
export class IndexerService {
  provider: JsonRpcProvider;
  retryInterval: number;
  retryTimes: number;
  liquidityContract: Contract;
  bridgeContract: Contract;
  latestBlockId: number;

  constructor(private readonly prisma: PrismaService) {
    const fetchReq = new FetchRequest(configurations().rpcUrl);
    if (configurations().httpsProxy !== '') {
      fetchReq.getUrlFunc = FetchRequest.createGetUrlFunc({
        agent: new HttpsProxyAgent(configurations().httpsProxy),
      });
    }
    this.provider = new JsonRpcProvider(fetchReq);
    this.retryInterval = configurations().retryInterval;
    this.retryTimes = configurations().retryTimes;
    const wallet = new Wallet(configurations().privateKey, this.provider);
    this.liquidityContract = new Contract(configurations().liquidityContractAddr, liquidityAbi, wallet);
    this.bridgeContract = new Contract(BRIDGE_ADDRESS, BridgeABI, wallet);
  }

  onModuleInit() {
    this.start();
  }

  async start() {
    let startBlock = START_BLOCK_NUMBER;
    Logger.log(`Indexer starts to work at block[${startBlock}]`, 'Indexer');
    // get the synced block number, if not found in db, create it
    const indexedBlockNum = await this.prisma.indexedRecord.findFirst({});
    if (indexedBlockNum) {
      startBlock = indexedBlockNum.blockNumber + 1;
      Logger.log(`Get synced block, will start at block[${startBlock}]`, 'Indexer');
      this.latestBlockId = indexedBlockNum.id;
    } else {
      const insertRes = await this.prisma.indexedRecord.create({
        data: {
          blockNumber: startBlock,
          updateTime: DateTime.now().toJSDate(),
          pointCheckpoint: 0,
        },
      });
      this.latestBlockId = insertRes.id;
    }

    const addLiquidityTopic = this.liquidityContract.interface.getEvent('AddLiquidity');
    if (!addLiquidityTopic) {
      throw new Error('AddLiquidity event not found');
    }

    const decLiquidityTopic = this.liquidityContract.interface.getEvent('DecLiquidity');
    if (!decLiquidityTopic) {
      throw new Error('DecLiquidity event not found');
    }

    const bridgeTopic = this.bridgeContract.interface.getEvent('mapSwapIn');
    if (!bridgeTopic) {
      throw new Error('DecLiquidity event not found');
    }

    while (true) {
      try {
        // sleep a while, in case too many requests
        await new Promise((resolve) => setTimeout(resolve, configurations().indexerInterval));

        // get the latest block number
        const latestBlockNum = await this.provider.getBlockNumber();

        if (latestBlockNum <= startBlock) {
          continue;
        }

        const ev: PrismaPromise<any>[] = [];
        Logger.log(`Fetch events from block ${startBlock} to ${latestBlockNum}`, 'Indexer');

        const bridgeEvents = await this.#parseBridgeEvents(startBlock, latestBlockNum, bridgeTopic);
        const liquidityEvents = await this.#parseAddLiquidityEvents(startBlock, latestBlockNum, addLiquidityTopic);
        const decLiquidityEvents = await this.#parseDecLiquidityEvents(startBlock, latestBlockNum, decLiquidityTopic);

        if (!bridgeEvents && !liquidityEvents && !decLiquidityEvents) {
          if (startBlock < latestBlockNum) {
            await this.#updateLatestBlock({ blockNumber: latestBlockNum });
            Logger.log(`Update synced block to ${latestBlockNum} success`, 'Indexer');
            startBlock = latestBlockNum;
          }
          continue;
        }

        // update parsed events
        if (bridgeEvents) {
          ev.push(this.prisma.bridgeEvent.createMany({ data: bridgeEvents, skipDuplicates: true }));
          ev.push(...this.generatePointTxs(bridgeEvents));
          ev.push(this.generatePointHistoryTx(bridgeEvents));
          Logger.log(`Parsed ${bridgeEvents.length} stake events from block ${startBlock} to block ${latestBlockNum}`, 'Indexer');
        }

        if (liquidityEvents) {
          ev.push(this.prisma.addLiquidityEvent.createMany({ data: liquidityEvents, skipDuplicates: true }));
          Logger.log(`Parsed ${liquidityEvents.length} addLiquidity events from block ${startBlock} to block ${latestBlockNum}`, 'Indexer');
        }

        if (decLiquidityEvents) {
          ev.push(this.prisma.removeLiquidityEvent.createMany({ data: decLiquidityEvents, skipDuplicates: true }));
          Logger.log(`Parsed ${decLiquidityEvents.length} decLiquidity events from block [${startBlock}-${latestBlockNum}]`, 'Indexer');
        }

        // update parsed blockNumber
        ev.push(
          this.prisma.indexedRecord.update({
            data: {
              blockNumber: latestBlockNum,
            },
            where: {
              id: this.latestBlockId,
            },
          }),
        );
        await this.prisma.$transaction(ev);
        startBlock = latestBlockNum;
        Logger.log(`Update synced block to ${latestBlockNum} success`, 'Indexer');
      } catch (e) {
        Logger.error(e, 'Indexer');
      }
    }
  }

  generatePointTxs = (bridgeEvents: any[]) => {
    return bridgeEvents.map((event) => {
      const price = prices[event.tokenAddr];
      const point = BRIDGE_POINT_PER_DOLLAR.multipliedBy(event.amount)
        .div(10 ** 18)
        .multipliedBy(price ?? 0)
        .toFixed(6);
      return this.prisma.point.upsert({
        where: {
          userAddr: event.to,
        },
        create: {
          userAddr: event.to,
          mapoPoint: new Prisma.Decimal(Number(point)),
          hivePoint: new Prisma.Decimal(0),
          point: new Prisma.Decimal(Number(point)),
        },
        update: {
          mapoPoint: {
            increment: new Prisma.Decimal(point),
          },
          point: {
            increment: new Prisma.Decimal(point),
          },
        },
      });
    });
  };
  generatePointHistoryTx = (bridgeEvents: any[]) => {
    const data = bridgeEvents.map((event) => {
      const price = prices[event.tokenAddr];
      const point = BRIDGE_POINT_PER_DOLLAR.multipliedBy(event.amount)
        .div(10 ** 18)
        .multipliedBy(price ?? 0)
        .toFixed(6);
      return {
        userAddr: event.to,
        timestamp: event.timestamp,
        point: new Prisma.Decimal(Number(point)),
        action: 1,
        eventId: event.eventId,
        epollId: 0,
      };
    });
    return this.prisma.pointHistory.createMany({
      data: data,
      skipDuplicates: true,
    });
  };

  isRightBridgeEvent(event: Result) {
    const wrongFromChain = event.fromChain !== 4200n && event.fromChain !== 56n && event.fromChain !== 1n;
    if (wrongFromChain) return false;
    if (event.toChain !== 22776n) return false;

    return SUPPORTED_BRIDGE_TOKENS.includes(event.token.toLowerCase());
  }

  async #parseBridgeEvents(startBlock: number, latestBlockNum: number, topic: EventFragment) {
    const started = startBlock < START_SYNC_BRIDGE_BLOCK_NUMBER ? START_SYNC_BRIDGE_BLOCK_NUMBER : startBlock;

    const logs = await this.provider.getLogs({
      fromBlock: started,
      toBlock: latestBlockNum,
      address: BRIDGE_ADDRESS,
      topics: [topic.topicHash],
    });

    if (!logs || logs.length === 0) {
      return null;
    }

    const events: BridgeEvent[] = [];
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const parsed = this.bridgeContract.interface.decodeEventLog(topic, log.data, log.topics);

      if (!this.isRightBridgeEvent(parsed)) {
        continue;
      }

      const block = await log.getBlock();

      events.push({
        id: 0,
        timestamp: block.timestamp,
        blockNumber: log.blockNumber,
        fromChainId: parsed.fromChain,
        toChainId: parsed.toChain,
        amount: parsed.amountOut.toString(),
        tokenAddr: parsed.token.toLowerCase(),
        from: parsed.from,
        to: parsed.toAddress,
        orderId: parsed.orderId,
        eventId: log.transactionHash + '-' + log.index,
      });
    }

    return events;
  }

  async #parseAddLiquidityEvents(
    startBlock: number,
    latestBlockNum: number,
    addLiquidityTopic: EventFragment,
  ): Promise<AddLiquidityEvent[] | null> {
    return new Promise(async (resolve, reject) => {
      try {
        const logs = await retry(this.provider.getLogs, this.retryTimes, this.retryInterval, this.provider, {
          fromBlock: startBlock,
          toBlock: latestBlockNum,
          address: this.liquidityContract.target,
          topics: [addLiquidityTopic.topicHash],
        });

        if (!logs || logs.length === 0) {
          return resolve(null);
        }
        const events: AddLiquidityEvent[] = [];
        for (let i = 0; i < logs.length; i++) {
          const parsed = this.liquidityContract.interface.decodeEventLog(addLiquidityTopic, logs[i].data, logs[i].topics);
          if (!poolMap.has(parsed.pool.toLowerCase()) && logs[i].blockNumber < NEW_POOL_BLOCK) {
            continue;
          }
          const timestamp = (await logs[i].getBlock()).timestamp;

          const tx = await retry(logs[i].getTransaction, this.retryTimes, this.retryInterval, logs[i]);
          const user = tx.from;
          const tokenX = newPoolMap.get(parsed.pool.toLowerCase())?.tokenX.address ?? '';
          const tokenY = newPoolMap.get(parsed.pool.toLowerCase())?.tokenY.address ?? '';
          events.push({
            id: 0,
            timestamp: timestamp,
            userAddr: user,
            tokenX: tokenX,
            tokenY: tokenY,
            amountX: parsed.amountX.toString(),
            amountY: parsed.amountY.toString(),
            eventId: tx.hash + '-' + logs[i].index,
            valid: this.#isValidOneSideStake({
              tokenX: tokenX,
              tokenY: tokenY,
              amountX: parsed.amountX.toString(),
              amountY: parsed.amountY.toString(),
            }),
          });
        }

        resolve(events);
      } catch (err) {
        reject(err);
      }
    });
  }

  async #parseDecLiquidityEvents(
    startBlock: number,
    latestBlockNum: number,
    decLiquidityTopic: EventFragment,
  ): Promise<AddLiquidityEvent[] | null> {
    return new Promise(async (resolve, reject) => {
      try {
        const logs = await retry(this.provider.getLogs, this.retryTimes, this.retryInterval, this.provider, {
          fromBlock: startBlock,
          toBlock: latestBlockNum,
          address: this.liquidityContract.target,
          topics: [decLiquidityTopic.topicHash],
        });

        if (!logs || logs.length === 0) {
          return resolve(null);
        }
        const events: RemoveLiquidityEvent[] = [];
        for (let i = 0; i < logs.length; i++) {
          const parsed = this.liquidityContract.interface.decodeEventLog(decLiquidityTopic, logs[i].data, logs[i].topics);

          if (!poolMap.has(parsed.pool.toLowerCase()) && logs[i].blockNumber < NEW_POOL_BLOCK) {
            continue;
          }
          const timestamp = (await logs[i].getBlock()).timestamp;
          const tx = await retry(logs[i].getTransaction, this.retryTimes, this.retryInterval, logs[i]);
          const user = tx.from;
          const tokenX = newPoolMap.get(parsed.pool.toLowerCase())?.tokenX.address ?? '';
          const tokenY = newPoolMap.get(parsed.pool.toLowerCase())?.tokenY.address ?? '';
          events.push({
            id: 0,
            timestamp: timestamp,
            userAddr: user,
            tokenX: tokenX,
            tokenY: tokenY,
            amountX: parsed.amountX.toString(),
            amountY: parsed.amountY.toString(),
            eventId: tx.hash + '-' + logs[i].index,
            valid: this.#isValidOneSideStake({
              tokenX: tokenX,
              tokenY: tokenY,
              amountX: parsed.amountX.toString(),
              amountY: parsed.amountY.toString(),
            }),
          });
        }
        resolve(events);
      } catch (err) {
        reject(err);
      }
    });
  }

  async #updateLatestBlock(update: { blockNumber: number }) {
    await this.prisma.indexedRecord.update({
      data: update,
      where: {
        id: this.latestBlockId,
      },
    });
  }

  // check if a tx is a valid one side stake tx
  #isValidOneSideStake(event: { tokenX: string; tokenY: string; amountX: string; amountY: string }): boolean {
    // active token list, including btc, mbtc, solvbtc
    const activeTokenList = [Tokens.BTC, Tokens.MBTC, Tokens.SolvBTC];
    // if tokenX stake 0
    if (event.amountX === '0') {
      // then tokenY must be in active token list, and tokenY must not be 0
      if (event.tokenY in activeTokenList && event.tokenY !== '0') {
        return true;
      }
    }
    // if tokenY stake 0
    if (event.amountY === '0') {
      // then tokenX must be in active token list, and tokenX must not be 0
      if (event.tokenX in activeTokenList && event.tokenX !== '0') {
        return true;
      }
    }
    // if both not 0, it is valid
    if (event.amountX !== '0' && event.amountY !== '0') {
      return true;
    }
    // invalid otherwise
    return false;
  }
}

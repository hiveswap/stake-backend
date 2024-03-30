import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JsonRpcProvider, Contract, EventFragment, FetchRequest, Wallet } from 'ethers';
import { stakeAbi, liquidityAbi } from '../resources/contract/abi';
import { retry } from '../utils/retry';
import { AddLiquidityEvent, LockEvent, PrismaPromise, RemoveLiquidityEvent } from '@prisma/client';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Logger } from '@nestjs/common';
import configurations from '../config/configurations';
import { DateTime } from 'luxon';
import { poolMap } from 'src/utils/constants';

@Injectable()
export class IndexerService {
  provider: JsonRpcProvider;
  retryInterval: number;
  retryTimes: number;
  lockerContract: Contract;
  liquidityContract: Contract;
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
    this.lockerContract = new Contract(configurations().stakeContractAddr, stakeAbi);
    const wallet = new Wallet(configurations().privateKey, this.provider);
    this.liquidityContract = new Contract(configurations().liquidityContractAddr, liquidityAbi, wallet);
  }

  onModuleInit() {
    this.start();
  }

  async start() {
    let startBlock = configurations().startBlockNum;
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

    const lockTopic = this.lockerContract.interface.getEvent('Lock');
    if (!lockTopic) {
      throw new Error('Lock event not found');
    }

    const addLiquidityTopic = this.liquidityContract.interface.getEvent('AddLiquidity');
    if (!addLiquidityTopic) {
      throw new Error('AddLiquidity event not found');
    }

    const decLiquidityTopic = this.liquidityContract.interface.getEvent('DecLiquidity');
    if (!decLiquidityTopic) {
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
        // parse logs from startBlock to latest block number
        const lockEvents = await this.#parseLockEvents(startBlock, latestBlockNum, lockTopic);
        const liquidityEvents = await this.#parseAddLiquidityEvents(startBlock, latestBlockNum, addLiquidityTopic);
        const decLiquidityEvents = await this.#parseDecLiquidityEvents(startBlock, latestBlockNum, decLiquidityTopic);

        if (!lockEvents && !liquidityEvents && !decLiquidityEvents) {
          if (startBlock < latestBlockNum) {
            await this.#updateLatestBlock({
              blockNumber: latestBlockNum,
            });
            Logger.log(`Update synced block to ${latestBlockNum} success`, 'Indexer');
            startBlock = latestBlockNum;
          }
          continue;
        }

        // update parsed events
        if (lockEvents) {
          ev.push(this.prisma.lockEvent.createMany({ data: lockEvents, skipDuplicates: true }));
          Logger.log(`Parsed ${lockEvents.length} stake events from block ${startBlock} to block ${latestBlockNum}`, 'Indexer');
        }
        if (liquidityEvents) {
          ev.push(this.prisma.addLiquidityEvent.createMany({ data: liquidityEvents, skipDuplicates: true }));
          Logger.log(`Parsed ${liquidityEvents.length} addLiquidity events from block ${startBlock} to block ${latestBlockNum}`, 'Indexer');
        }
        if (decLiquidityEvents) {
          ev.push(this.prisma.removeLiquidityEvent.createMany({ data: decLiquidityEvents, skipDuplicates: true }));
          Logger.log(
            `Parsed ${decLiquidityEvents.length} decLiquidity events from block ${startBlock} to block ${latestBlockNum}`,
            'Indexer',
          );
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
      } catch (_) {
        continue;
      }
    }
  }

  async #parseLockEvents(startBlock: number, latestBlockNum: number, lockTopic: EventFragment): Promise<LockEvent[] | null> {
    return new Promise(async (resolve) => {
      const logs = await this.provider.getLogs({
        fromBlock: startBlock,
        toBlock: latestBlockNum,
        address: this.lockerContract.target,
        topics: [lockTopic.topicHash],
      });

      if (!logs || logs.length === 0) {
        return resolve(null);
      }

      const events: LockEvent[] = [];
      for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        const parsed = this.lockerContract.interface.decodeEventLog(lockTopic, log.data, log.topics);

        const block = await log.getBlock();
        const tx = await log.getTransaction();

        events.push({
          id: 0,
          timestamp: block.timestamp,
          userAddr: parsed.user,
          amount: parsed.amount.toString(),
          tokenAddr: parsed.token,
          eventId: tx.hash + '-' + log.index,
        });
      }

      resolve(events);
    });
  }

  async #parseAddLiquidityEvents(
    startBlock: number,
    latestBlockNum: number,
    addLiquidityTopic: EventFragment,
  ): Promise<AddLiquidityEvent[] | null> {
    return new Promise(async (resolve) => {
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

        const poolID = await retry(this.liquidityContract.poolIds, this.retryTimes, this.retryInterval, this, parsed.pool);
        const tokens = await retry(this.liquidityContract.poolMetas, this.retryTimes, this.retryInterval, this, poolID);
        const index = [tokens.tokenX, tokens.tokenY].join(',');
        if (!poolMap.has(index)) {
          continue;
        }
        const tx = await retry(logs[i].getTransaction, this.retryTimes, this.retryInterval, logs[i]);
        const user = tx.from;
        events.push({
          id: 0,
          timestamp: new Date().getTime() / 1000,
          userAddr: user,
          tokenX: tokens.tokenX,
          tokenY: tokens.tokenY,
          amountX: parsed.amountX.toString(),
          amountY: parsed.amountY.toString(),
          eventId: tx.hash + '-' + logs[i].index,
        });
      }

      resolve(events);
    });
  }

  async #parseDecLiquidityEvents(
    startBlock: number,
    latestBlockNum: number,
    decLiquidityTopic: EventFragment,
  ): Promise<AddLiquidityEvent[] | null> {
    return new Promise(async (resolve) => {
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

        const poolID = await retry(this.liquidityContract.poolIds, this.retryTimes, this.retryInterval, this, parsed.pool);
        const tokens = await retry(this.liquidityContract.poolMetas, this.retryTimes, this.retryInterval, this, poolID);
        const index = [tokens.tokenX, tokens.tokenY].join(',');
        if (!poolMap.has(index)) {
          continue;
        }
        const tx = await retry(logs[i].getTransaction, this.retryTimes, this.retryInterval, logs[i]);
        const user = tx.from;

        events.push({
          id: 0,
          timestamp: new Date().getTime() / 1000,
          userAddr: user,
          tokenX: tokens.tokenX,
          tokenY: tokens.tokenY,
          amountX: parsed.amountX.toString(),
          amountY: parsed.amountY.toString(),
          eventId: tx.hash + '-' + logs[i].index,
        });
      }
      resolve(events);
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
}

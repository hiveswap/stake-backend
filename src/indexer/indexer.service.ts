import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  JsonRpcProvider,
  Contract,
  EventFragment,
  FetchRequest,
  Wallet,
} from 'ethers';
import { stakeAbi, liquidityAbi } from '../resources/contract/abi';
import { retry } from '../utils/retry';
import {
  RawAddLiquidityEvents,
  RawDecLiquidityEvents,
  RawStakeEvents,
} from '@prisma/client';
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
  stakeContract: Contract;
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
    this.stakeContract = new Contract(
      configurations().stakeContractAddr,
      stakeAbi,
    );
    const wallet = new Wallet(configurations().privateKey, this.provider);
    this.liquidityContract = new Contract(
      configurations().liquidityContractAddr,
      liquidityAbi,
      wallet,
    );
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
      Logger.log(
        `Get synced block, will start at block[${startBlock}]`,
        'Indexer',
      );
      this.latestBlockId = indexedBlockNum.id;
    } else {
      const insertRes = await this.prisma.indexedRecord.create({
        data: {
          blockNumber: startBlock,
          updateTime: DateTime.now().setZone('Asia/Singapore').toJSDate(),
        },
      });
      this.latestBlockId = insertRes.id;
    }
    const stakeTopic = this.stakeContract.interface.getEvent('Lock');
    if (!stakeTopic) {
      throw new Error('Lock event not found');
    }
    const addLiquidityTopic =
      this.liquidityContract.interface.getEvent('AddLiquidity');
    if (!addLiquidityTopic) {
      throw new Error('AddLiquidity event not found');
    }

    const decLiquidityTopic =
      this.liquidityContract.interface.getEvent('DecLiquidity');
    if (!decLiquidityTopic) {
      throw new Error('DecLiquidity event not found');
    }
    while (true) {
      // sleep a while, in case too many requests
      await new Promise((resolve) =>
        setTimeout(resolve, configurations().indexerInterval),
      );
      // get the latest block number
      const latestBlockNum = await retry(
        this.provider.getBlockNumber,
        this.retryTimes,
        this.retryInterval,
        this.provider,
      );

      if (latestBlockNum <= startBlock) {
        continue;
      }
      Logger.log(`Get latest block[${latestBlockNum}]`, 'Indexer');
      // parse logs from startBlock to latest block number
      const stakeEvents = await this.#parseStakeEvents(
        startBlock,
        latestBlockNum,
        stakeTopic,
      );
      const liquidityEvents = await this.#parseAddLiquidityEvents(
        startBlock,
        latestBlockNum,
        addLiquidityTopic,
      );
      const decLiquidityEvents = await this.#parseDecLiquidityEvents(
        startBlock,
        latestBlockNum,
        decLiquidityTopic,
      );

      if (!stakeEvents && !liquidityEvents && !decLiquidityEvents) {
        if (startBlock < latestBlockNum) {
          await retry(
            this.#updateLatestBlock,
            this.retryTimes,
            this.retryInterval,
            this,
            {
              blockNumber: latestBlockNum,
            },
          );
          Logger.log(
            `Update synced block to ${latestBlockNum} success`,
            'Indexer',
          );
          startBlock = latestBlockNum;
        }
        continue;
      }
      // update parsed events
      if (stakeEvents) {
        await retry(
          this.#updateStakeEvents,
          this.retryTimes,
          this.retryInterval,
          this,
          stakeEvents,
        );
        Logger.log(
          `Parsed ${stakeEvents.length} stake events from block ${startBlock} to block ${latestBlockNum}`,
          'Indexer',
        );
      }
      if (liquidityEvents) {
        await retry(
          this.#updateLiquidityEvents,
          this.retryTimes,
          this.retryInterval,
          this,
          liquidityEvents,
        );
        Logger.log(
          `Parsed ${liquidityEvents.length} addLiquidity events from block ${startBlock} to block ${latestBlockNum}`,
          'Indexer',
        );
      }
      if (decLiquidityEvents) {
        await retry(
          this.#updateDecLiquidityEvents,
          this.retryTimes,
          this.retryInterval,
          this,
          decLiquidityEvents,
        );
        Logger.log(
          `Parsed ${decLiquidityEvents.length} decLiquidity events from block ${startBlock} to block ${latestBlockNum}`,
          'Indexer',
        );
      }
      Logger.log(`write events to db success`);
      // update parsed blockNumber
      startBlock = latestBlockNum;
      await retry(
        this.#updateLatestBlock,
        this.retryTimes,
        this.retryInterval,
        this,
        {
          blockNumber: latestBlockNum,
        },
      );
      Logger.log(`Update synced block to ${latestBlockNum} success`, 'Indexer');
    }
  }

  async #parseStakeEvents(
    startBlock: number,
    latestBlockNum: number,
    stakeTopic: EventFragment,
  ): Promise<RawStakeEvents[] | null> {
    return new Promise(async (resolve) => {
      const logs = await retry(
        this.provider.getLogs,
        this.retryTimes,
        this.retryInterval,
        this.provider,
        {
          fromBlock: startBlock,
          toBlock: latestBlockNum,
          address: this.stakeContract.target,
          topics: [stakeTopic.topicHash],
        },
      );

      if (!logs || logs.length === 0) {
        return resolve(null);
      }
      const events: RawStakeEvents[] = [];
      logs.forEach((log) => {
        const parsed = this.stakeContract.interface.decodeEventLog(
          stakeTopic,
          log.data,
          log.topics,
        );
        events.push({
          id: 0,
          timestamp: new Date(),
          userAddr: parsed.user,
          amount: parsed.amount.toString(),
          tokenAddr: parsed.token,
        });
      });
      resolve(events);
    });
  }

  async #parseAddLiquidityEvents(
    startBlock: number,
    latestBlockNum: number,
    addLiquidityTopic: EventFragment,
  ): Promise<RawAddLiquidityEvents[] | null> {
    return new Promise(async (resolve) => {
      const logs = await retry(
        this.provider.getLogs,
        this.retryTimes,
        this.retryInterval,
        this.provider,
        {
          fromBlock: startBlock,
          toBlock: latestBlockNum,
          address: this.liquidityContract.target,
          topics: [addLiquidityTopic.topicHash],
        },
      );

      if (!logs || logs.length === 0) {
        return;
      }
      const events: RawAddLiquidityEvents[] = [];
      for (let i = 0; i < logs.length; i++) {
        const parsed = this.liquidityContract.interface.decodeEventLog(
          addLiquidityTopic,
          logs[i].data,
          logs[i].topics,
        );

        const poolID = await retry(
          this.liquidityContract.poolIds,
          this.retryTimes,
          this.retryInterval,
          this,
          parsed.pool,
        );
        const tokens = await retry(
          this.liquidityContract.poolMetas,
          this.retryTimes,
          this.retryInterval,
          this,
          poolID,
        );
        const index = [tokens.tokenX, tokens.tokenY].join(',');
        if (!poolMap.has(index)) {
          continue;
        }
        const tx = await retry(
          logs[i].getTransaction,
          this.retryTimes,
          this.retryInterval,
          logs[i],
        );
        const user = tx.from;
        events.push({
          id: 0,
          timestamp: new Date(),
          userAddr: user,
          tokenX: tokens.tokenX,
          tokenY: tokens.tokenY,
          amountX: parsed.amountX.toString(),
          amountY: parsed.amountY.toString(),
        });
      }

      resolve(events);
    });
  }

  async #parseDecLiquidityEvents(
    startBlock: number,
    latestBlockNum: number,
    decLiquidityTopic: EventFragment,
  ): Promise<RawAddLiquidityEvents[] | null> {
    return new Promise(async (resolve) => {
      const logs = await retry(
        this.provider.getLogs,
        this.retryTimes,
        this.retryInterval,
        this.provider,
        {
          fromBlock: startBlock,
          toBlock: latestBlockNum,
          address: this.liquidityContract.target,
          topics: [decLiquidityTopic.topicHash],
        },
      );

      if (!logs || logs.length === 0) {
        return;
      }
      const events: RawDecLiquidityEvents[] = [];
      for (let i = 0; i < logs.length; i++) {
        const parsed = this.liquidityContract.interface.decodeEventLog(
          decLiquidityTopic,
          logs[i].data,
          logs[i].topics,
        );

        const poolID = await retry(
          this.liquidityContract.poolIds,
          this.retryTimes,
          this.retryInterval,
          this,
          parsed.pool,
        );
        const tokens = await retry(
          this.liquidityContract.poolMetas,
          this.retryTimes,
          this.retryInterval,
          this,
          poolID,
        );
        const index = [tokens.tokenX, tokens.tokenY].join(',');
        if (!poolMap.has(index)) {
          continue;
        }
        const tx = await retry(
          logs[i].getTransaction,
          this.retryTimes,
          this.retryInterval,
          logs[i],
        );
        const user = tx.from;

        events.push({
          id: 0,
          timestamp: new Date(),
          userAddr: user,
          tokenX: tokens.tokenX,
          tokenY: tokens.tokenY,
          amountX: parsed.amountX.toString(),
          amountY: parsed.amountY.toString(),
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

  async #updateStakeEvents(events: RawStakeEvents[]) {
    if (!events || events.length === 0) {
      return;
    }
    await this.prisma.rawStakeEvents.createMany({ data: events });
  }

  async #updateLiquidityEvents(events: RawAddLiquidityEvents[]) {
    if (!events || events.length === 0) {
      return;
    }
    await this.prisma.rawAddLiquidityEvents.createMany({ data: events });
  }

  async #updateDecLiquidityEvents(events: RawDecLiquidityEvents[]) {
    if (!events || events.length === 0) {
      return;
    }
    await this.prisma.rawDecLiquidityEvents.createMany({ data: events });
  }
}

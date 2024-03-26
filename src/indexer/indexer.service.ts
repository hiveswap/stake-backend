import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  JsonRpcProvider,
  Contract,
  EventFragment,
  FetchRequest,
  Log,
} from 'ethers';
import { liquidityAbi, stakeAbi } from '../resources/contract/abi';
import { retry } from '../utils/retry';
import { RawStakeEvents, RawAddLiquidityEvents, Prisma } from '@prisma/client';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Logger } from '@nestjs/common';
import configurations from '../config/configurations';
import { DateTime } from 'luxon';

type RawEvents = RawStakeEvents | RawAddLiquidityEvents;

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
    this.liquidityContract = new Contract(
      configurations().liquidityContractAddr,
      liquidityAbi,
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
    const stakeTopic = this.stakeContract.interface.getEvent('Stake');
    if (!stakeTopic) {
      throw new Error('Stake event not found');
    }

    const liquidityTopic =
      this.liquidityContract.interface.getEvent('AddLiquidity');
    if (!liquidityTopic) {
      throw new Error('AddLiquidity event not found');
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
      const stakeSuccess = await this.#parseLogs(
        startBlock,
        latestBlockNum,
        stakeTopic,
        this.stakeContract,
      );
      const liquiditSuccess = await this.#parseLogs(
        startBlock,
        latestBlockNum,
        liquidityTopic,
        this.liquidityContract,
      );
      if (!stakeSuccess && !liquiditSuccess) {
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

  async #parseLogs(
    startBlock: number,
    latestBlockNum: number,
    topic: EventFragment,
    contract: Contract,
  ): Promise<boolean> {
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
          topics: [topic.topicHash],
        },
      );

      if (!logs || logs.length === 0) {
        return resolve(false);
      }

      const events: Array<RawEvents> = [];
      logs.forEach((log) => {
        if (contract.target === this.stakeContract.target) {
          events.push(this.#decodeLog(this.stakeContract, topic, log));
        } else if (contract.target === this.liquidityContract.target) {
          events.push(this.#decodeLog(this.liquidityContract, topic, log));
        }
        resolve(this.#writeToDB(events, startBlock, latestBlockNum));
      });
    });
  }

  #decodeLog(contract: Contract, topic: EventFragment, log: Log): RawEvents {
    const parsed = contract.interface.decodeEventLog(
      topic,
      log.data,
      log.topics,
    );
    if (contract.target === this.stakeContract.target) {
      return {
        id: 0,
        timestamp: new Date(),
        userAddr: parsed.user,
        amount: parsed.amount,
        tokenAddr: parsed.token,
        lTokenAddr: parsed.lToken,
      } as RawStakeEvents;
    }
    return {
      id: 0,
      timestamp: new Date(),
      nftID: parsed.nftId,
      pool: parsed.pool,
      liquidityDelta: parsed.liquidityDelta,
      amountX: parsed.amountX,
      amountY: parsed.amountY,
    } as RawAddLiquidityEvents;
  }

  async #writeToDB(
    events: Array<RawEvents>,
    startBlock: number,
    latestBlockNum: number,
  ): Promise<boolean> {
    return new Promise(async (resolve) => {
      // update parsed events
      await retry(
        this.#updateEvents,
        this.retryTimes,
        this.retryInterval,
        this,
        events,
      );
      Logger.log(
        `Parsed ${events.length} events from block ${startBlock} to block ${latestBlockNum}`,
        'Indexer',
      );
      Logger.log(`write events to db success`);
      resolve(true);
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

  async #updateEvents(events: Array<RawStakeEvents | RawAddLiquidityEvents>) {
    return new Promise(async (resolve) => {
      if (!events || events.length === 0) {
        return;
      }
      if ('userAddr' in events[0]) {
        const txs: Prisma.PrismaPromise<any>[] = [];
        txs.push(
          this.prisma.rawStakeEvents.createMany({
            data: events as RawStakeEvents[],
          }),
        );
        events.forEach((event: RawStakeEvents) => {
          txs.push(
            this.prisma.tokenMap.upsert({
              create: {
                tokenAddr: event.tokenAddr,
                lTokenAddr: event.lTokenAddr,
              },
              where: {
                tokenAddr: event.tokenAddr,
              },
              update: {
                lTokenAddr: event.lTokenAddr,
              },
            }),
          );
        });
        resolve(this.prisma.$transaction(txs));
        return;
      }
      resolve(
        this.prisma.rawAddLiquidityEvents.createMany({
          data: events as RawAddLiquidityEvents[],
        }),
      );
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JsonRpcProvider, Contract, EventFragment, FetchRequest } from 'ethers';
import { stakeAbi } from '../resources/contract/abi';
import { retry } from '../utils/retry';
import { RawStakeEvents } from '@prisma/client';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Logger } from '@nestjs/common';
import configurations from '../config/configurations';
import { DateTime } from 'luxon';

@Injectable()
export class IndexerService {
  provider: JsonRpcProvider;
  retryInterval: number;
  retryTimes: number;
  contract: Contract;
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
    this.contract = new Contract(configurations().stakeContractAddr, stakeAbi);
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
    const topic = this.contract.interface.getEvent('Lock');
    if (!topic) {
      throw new Error('Lock event not found');
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
      const events = await this.#parseLogs(startBlock, latestBlockNum, topic);
      if (!events) {
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
          address: this.contract.target,
          topics: [topic.topicHash],
        },
      );

      if (!logs || logs.length === 0) {
        return resolve(null);
      }
      const events: RawStakeEvents[] = [];
      logs.forEach((log) => {
        const parsed = this.contract.interface.decodeEventLog(
          topic,
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

  async #updateLatestBlock(update: { blockNumber: number }) {
    await this.prisma.indexedRecord.update({
      data: update,
      where: {
        id: this.latestBlockId,
      },
    });
  }

  async #updateEvents(events: RawStakeEvents[]) {
    await this.prisma.rawStakeEvents.createMany({ data: events });
  }
}

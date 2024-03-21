import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JsonRpcProvider, Contract, EventFragment, FetchRequest } from 'ethers';
import { abi } from '../resources/contract/abi';
import { retry } from '../utils/retry';
import { RawEvents } from '@prisma/client';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Logger } from '@nestjs/common';
import configurations from '../config/configurations';

@Injectable()
export class IndexerService {
  provider: JsonRpcProvider;
  retryInterval: number;
  retryTimes: number;
  contract: Contract;
  latestBlockId: string;

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
    this.contract = new Contract(configurations().contractAddr, abi);
  }

  onModuleInit() {
    this.start();
  }

  async start() {
    let startBlock = configurations().startBlockNum;
    Logger.log(`Indexer starts to work at block[${startBlock}]`, 'Indexer');
    // get the synced block number, if not found in db, create it
    const indexedBlockNum = await this.prisma.indexedBlock.findFirst({});
    if (indexedBlockNum) {
      startBlock = indexedBlockNum.blockNumber + 1;
      Logger.log(
        `Get synced block, will start at block[${startBlock}]`,
        'Indexer',
      );
      this.latestBlockId = indexedBlockNum.id;
    } else {
      const insertRes = await this.prisma.indexedBlock.create({
        data: { blockNumber: startBlock },
      });
      this.latestBlockId = insertRes.id;
    }
    const topic = this.contract.interface.getEvent('Stake');
    if (!topic) {
      throw new Error('Stake event not found');
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
  ): Promise<RawEvents[] | null> {
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
      const events: RawEvents[] = [];
      logs.forEach((log) => {
        const parsed = this.contract.interface.decodeEventLog(
          topic,
          log.data,
          log.topics,
        );
        events.push({
          id: '',
          timestamp: new Date(),
          blockNum: log.blockNumber,
          userAddr: parsed.user,
          amount: parsed.userInfo.amount.toString(),
          tokenAddr: parsed.userInfo.tokenAddr,
          lpToken: parsed.userInfo.lpToken.toString(),
        });
      });
      resolve(events);
    });
  }

  async #updateLatestBlock(update: { blockNumber: number }) {
    await this.prisma.indexedBlock.update({
      data: update,
      where: {
        id: this.latestBlockId,
      },
    });
  }

  async #updateEvents(events: RawEvents[]) {
    await this.prisma.rawEvents.createMany({ data: events });
  }
}

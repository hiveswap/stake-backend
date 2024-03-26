import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  JsonRpcProvider,
  Contract,
  FetchRequest,
  Interface,
  Wallet,
} from 'ethers';
import { liquidityAbi, stakeAbi } from '../resources/contract/abi';
import { retry } from '../utils/retry';
import { RawAddLiquidityEvents, RawStakeEvents } from '@prisma/client';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Logger } from '@nestjs/common';
import configurations from '../config/configurations';
import { DateTime } from 'luxon';

@Injectable()
export class IndexerService {
  provider: JsonRpcProvider;
  retryInterval: number;
  retryTimes: number;
  stakeContract: Contract;
  liquidityContract: Contract;
  latestBlockId: number;
  wallet: Wallet;

  constructor(private readonly prisma: PrismaService) {
    const fetchReq = new FetchRequest(configurations().rpcUrl);
    if (configurations().httpsProxy !== '') {
      fetchReq.getUrlFunc = FetchRequest.createGetUrlFunc({
        agent: new HttpsProxyAgent(configurations().httpsProxy),
      });
    }
    this.provider = new JsonRpcProvider(fetchReq);
    this.wallet = new Wallet(configurations().privateKey, this.provider);

    this.retryInterval = configurations().retryInterval;
    this.retryTimes = configurations().retryTimes;
    this.stakeContract = new Contract(
      configurations().stakeContractAddr,
      stakeAbi,
    );
    this.liquidityContract = new Contract(
      configurations().liquidityContractAddr,
      liquidityAbi,
      this.wallet,
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
    const stakeTopic = new Interface(stakeAbi);

    const liquidityInput = new Interface(liquidityAbi);

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
      const step = 20;
      for (let i = startBlock; i <= latestBlockNum; i = i + step) {
        const endBlock = i + step - 1;
        // parse logs from startBlock to latest block number
        await this.#parseLogs(i, endBlock, stakeTopic, liquidityInput);

        // update parsed blockNumber
        await retry(
          this.#updateLatestBlock,
          this.retryTimes,
          this.retryInterval,
          this,
          {
            blockNumber: endBlock,
          },
        );
        Logger.log(
          `Update synced block from ${i} to ${endBlock} success`,
          'Indexer',
        );
      }
    }
  }

  async #parseLogs(
    startBlock: number,
    latestBlockNum: number,
    stakeTopic: Interface,
    liquidityInput: Interface,
  ): Promise<boolean> {
    return new Promise(async (resolve) => {
      const stakeEvents: RawStakeEvents[] = [];
      const liquidityEvents: RawAddLiquidityEvents[] = [];
      for (let i = startBlock; i <= latestBlockNum; i++) {
        const block = await this.provider.getBlock(i, true);
        block?.prefetchedTransactions.forEach(async (prefetchTx) => {
          if (prefetchTx?.to == this.stakeContract.target) {
            const txReceipt = await this.provider.getTransactionReceipt(
              prefetchTx.hash,
            );
            txReceipt?.logs.forEach((log) => {
              try {
                const parsed = stakeTopic.parseLog(log);

                if (parsed?.name === 'Stake') {
                  stakeEvents.push({
                    id: 0,
                    timestamp: new Date(),
                    userAddr: parsed?.args[0],
                    amount: parsed?.args[2].toString(),
                    tokenAddr: parsed?.args[1],
                  });
                  Logger.log(`parsed Stake event from block ${i} success`);
                }
              } catch (error) {
                return;
              }
            });
          } else if (prefetchTx?.to == this.liquidityContract.target) {
            try {
              const parsed = liquidityInput.parseTransaction(prefetchTx);
              if (parsed?.name === 'Mint') {
                liquidityEvents.push({
                  id: 0,
                  timestamp: new Date(),
                  userAddr: prefetchTx.from,
                  tokenX: parsed?.args[1],
                  tokenY: parsed?.args[2],
                  amountX: parsed?.args[6],
                  amountY: parsed?.args[7],
                });
              } else if (parsed?.name === 'addLiquidity') {
                const nft = parsed.args[0];
                const poolInfo = await this.liquidityContract.poolMetas(nft);
                liquidityEvents.push({
                  id: 0,
                  timestamp: new Date(),
                  userAddr: prefetchTx.from,
                  tokenX: poolInfo[0],
                  tokenY: poolInfo[1],
                  amountX: parsed?.args[6],
                  amountY: parsed?.args[7],
                });
              }
            } catch (err) {
              return;
            }
          }
        });
      }

      resolve(this.#writeToDB(stakeEvents, liquidityEvents));
    });
  }

  async #writeToDB(
    stakeEvents: Array<RawStakeEvents>,
    liquidityEvents: Array<RawAddLiquidityEvents>,
  ): Promise<boolean> {
    return new Promise(async (resolve) => {
      // update parsed events
      if (stakeEvents.length !== 0) {
        await retry(
          this.#updateEvents,
          this.retryTimes,
          this.retryInterval,
          this,
          stakeEvents,
        );
      }
      if (liquidityEvents.length !== 0) {
        await retry(
          this.#updateEvents,
          this.retryTimes,
          this.retryInterval,
          this,
          liquidityEvents,
        );
      }
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
        resolve(
          this.prisma.rawStakeEvents.createMany({
            data: events as RawStakeEvents[],
          }),
        );
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

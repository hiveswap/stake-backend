export default () => ({
  port: parseInt(
    process.env.STAKE_BACKEND_PORT ? process.env.STAKE_BACKEND_PORT : '3000',
    10,
  ),
  database: process.env.DATABASE_URL,
  indexerInterval: parseInt(
    process.env.INDEXER_INTERVAL ? process.env.INDEXER_INTERVAL : '1000',
    10,
  ),
  retryInterval: parseInt(
    process.env.RETRY_INTERVAL ? process.env.RETRY_INTERVAL : '1000',
    10,
  ),
  retryTimes: parseInt(
    process.env.RETRY_TIMES ? process.env.RETRY_TIMES : '10',
    10,
  ),
  contractAddr: process.env.CONTRACT_ADDR || '',
  startBlockNum: parseInt(
    process.env.DEPLOY_BLOCK_NUMBER ? process.env.DEPLOY_BLOCK_NUMBER : '1',
    10,
  ),
  rpcUrl: process.env.CHAIN_RPC_URL || '',
  httpsProxy: process.env.HTTPS_PROXY || '',
});

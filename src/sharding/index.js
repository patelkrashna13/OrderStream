const { ShardRouter, defaultShardRouter } = require('./shard-router');
const shardStrategies = require('./shard-key.strategy');

module.exports = {
  ShardRouter,
  defaultShardRouter,
  ...shardStrategies,
};

const poolManager = require('./pool');
const { runMigrations } = require('./migrate');

module.exports = {
  ...poolManager,
  runMigrations,
};

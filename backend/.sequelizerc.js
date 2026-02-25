/**
 * Sequelize CLI Configuration
 * Configures paths for migrations, seeders, and models
 */

const path = require('path');

module.exports = {
  config: path.resolve(__dirname, 'config/config.json'),
  'migrations-path': path.resolve(__dirname, 'src/infrastructure/database/migrations'),
  'seeders-path': path.resolve(__dirname, 'src/infrastructure/database/seeders'),
  'models-path': path.resolve(__dirname, 'src/infrastructure/database/models'),
};

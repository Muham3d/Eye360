import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This simulates what models/index.ts does
const dbDir = path.resolve(__dirname, 'src/infrastructure/config');
console.log('Model config __dirname:', __dirname);
console.log('Model config dbDir:', dbDir);

const dataPath = path.resolve(dbDir, '../../data');
console.log('Model config data path:', dataPath);

const dbPath1 = path.join(dataPath, 'patrolmanager.sqlite');
console.log('Database path 1:', dbPath1);

// This is what create-admin.cjs does
const dataPath2 = path.resolve(process.cwd(), 'data');
console.log('process.cwd data path:', dataPath2);

const dbPath2 = path.join(dataPath2, 'patrolmanager.sqlite');
console.log('Database path 2:', dbPath2);

// Check if they're the same
console.log('Same path?', dbPath1 === dbPath2);

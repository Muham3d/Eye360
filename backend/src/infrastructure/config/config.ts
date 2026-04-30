import convict from 'convict';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = convict({
    env: {
        doc: 'The application environment.',
        format: ['production', 'development', 'test'],
        default: 'development',
        env: 'NODE_ENV',
    },
    port: {
        doc: 'The port to bind.',
        format: 'port',
        default: 3000,
        env: 'PORT',
    },
    db: {
        host: {
            doc: 'Database host name/IP',
            format: String,
            default: 'localhost',
            env: 'DB_HOST',
        },
        name: {
            doc: 'Database name',
            format: String,
            default: 'patrolmanager',
            env: 'DB_NAME',
        },
        user: {
            doc: 'Database user',
            format: String,
            default: 'postgres',
            env: 'DB_USER',
        },
        password: {
            doc: 'Database password',
            format: String,
            default: 'password',
            env: 'DB_PASS',
            sensitive: true,
        },
        port: {
            doc: 'Database port',
            format: 'port',
            default: 5432,
            env: 'DB_PORT',
        },
        dialect: {
            doc: 'Database dialect',
            format: String,
            default: 'postgres',
            env: 'DB_DIALECT',
        },
    },
    redis: {
        url: {
            doc: 'Redis connection URL',
            format: String,
            default: 'redis://localhost:6379',
            env: 'REDIS_URL',
        },
    },
    jwt: {
        secret: {
            doc: 'JWT secret key',
            format: String,
            default: 'your_super_secret_jwt_key_32_characters_at_least',
            env: 'JWT_SECRET',
            sensitive: true,
        },
        expiresIn: {
            doc: 'JWT expiration time',
            format: String,
            default: '24h',
            env: 'JWT_EXPIRES_IN',
        },
        issuer: {
            doc: 'JWT issuer',
            format: String,
            default: 'patrolmanager',
            env: 'JWT_ISSUER',
        },
        audience: {
            doc: 'JWT audience',
            format: String,
            default: 'patrolmanager-app',
            env: 'JWT_AUDIENCE',
        },
    },
    storage: {
        type: {
            doc: 'Storage type (local or s3)',
            format: ['local', 's3'],
            default: 'local',
            env: 'STORAGE_TYPE',
        },
        uploadDir: {
            doc: 'Directory for local uploads',
            format: String,
            default: './uploads',
            env: 'UPLOAD_DIR',
        },
    },
});

// Load any environment-specific config file if needed
// const env = config.get('env');
// config.loadFile(path.join(__dirname, `./${env}.json`));

// Perform validation
config.validate({ allowed: 'strict' });

export default config;

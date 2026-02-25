# Troubleshooting FAQ

This guide covers common issues and their solutions when developing and deploying PatrolManager.

## Table of Contents

- [Database Issues](#database-issues)
- [Port Conflicts](#port-conflicts)
- [Permission Errors](#permission-errors)
- [Test Failures](#test-failures)
- [Build Errors](#build-errors)
- [WebSocket Issues](#websocket-issues)
- [Authentication Problems](#authentication-problems)
- [File Upload Issues](#file-upload-issues)
- [Performance Issues](#performance-issues)
- [Deployment Issues](#deployment-issues)

---

## Database Issues

### PostgreSQL Connection Refused

**Error:** `ECONNREFUSED 127.0.0.1:5432` or `Error: connect ECONNREFUSED`

**Causes & Solutions:**

1. **PostgreSQL is not running**
   ```bash
   # Check if Docker container is running
   docker compose ps

   # Start PostgreSQL
   docker compose up -d postgres
   ```

2. **Wrong host in configuration**
   - If using Docker: Set `DB_HOST=postgres` (not `localhost`)
   - If using local PostgreSQL: Set `DB_HOST=localhost`

3. **Port is already in use**
   ```bash
   # Check what's using port 5432
   netstat -ano | findstr :5432  # Windows
   lsof -ti:5432                  # macOS/Linux

   # Kill the process or change DB_PORT in .env
   ```

4. **Database doesn't exist**
   ```bash
   # Create database
   npm run db:create
   ```

5. **Wrong credentials**
   ```bash
   # Verify credentials match .env
   cat .env | grep DB_

   # Reset database user password (local PostgreSQL)
   psql -U postgres
   ALTER USER patrolmanager WITH PASSWORD 'new_password';
   ```

### Migration Failures

**Error:** Migration fails to apply or reports "relation already exists"

**Solutions:**

1. **Check migration status**
   ```bash
   npm run db:migrate:status
   ```

2. **Undo and reapply migration**
   ```bash
   npm run db:migrate:undo
   npm run db:migrate
   ```

3. **Resolve "already exists" error**
   ```bash
   # If table already exists, manually drop it
   psql -h localhost -U patrolmanager -d patrolmanager
   DROP TABLE IF EXISTS <table_name> CASCADE;
   ```

4. **Reset entire database (development only)**
   ```bash
   npm run db:reset
   ```

5. **Migration file syntax error**
   - Check migration file for syntax errors
   - Ensure all `up` and `down` functions return promises
   - Use `sequelize.literal()` for raw SQL

### Database Pool Exhausted

**Error:** `Error: ResourceRequest timed out` or pool exhaustion errors

**Solutions:**

1. **Increase pool size in `.env`**
   ```bash
   DB_POOL_MAX=20
   DB_POOL_MIN=5
   ```

2. **Close connections properly**
   ```javascript
   // Always close Sequelize connections
   await sequelize.close();
   ```

3. **Check for connection leaks**
   - Use `sequelize.getConnection()` to debug
   - Look for unclosed database queries

### Seed Data Issues

**Error:** Seeding fails with foreign key or constraint violations

**Solutions:**

1. **Seed in correct order**
   ```bash
   # Check seeder file names ensure proper sequence
   ls backend/src/infrastructure/database/seeders/
   ```

2. **Undo and reseed**
   ```bash
   npm run db:seed:undo
   npm run db:seed:dev
   ```

3. **Verify foreign keys exist**
   - Check that referenced tables are created first
   - Ensure parent records exist before child records

---

## Port Conflicts

### EADDRINUSE: Address Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solutions:**

1. **Find and kill process using the port**
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F

   # macOS/Linux
   lsof -ti:3000 | xargs kill -9
   ```

2. **Change the port**
   ```bash
   # Edit .env
   PORT=3001
   ```

3. **Stop running Node.js processes**
   ```bash
   # List all Node processes
   ps aux | grep node   # macOS/Linux
   tasklist | findstr node  # Windows
   ```

### Docker Port Binding Failed

**Error:** `Bind for 0.0.0.0:5432 failed: port is already in use`

**Solutions:**

1. **Stop local PostgreSQL**
   ```bash
   # Windows
   net stop postgresql-x64-15

   # macOS (Homebrew)
   brew services stop postgresql
   ```

2. **Change Docker port mapping**
   ```yaml
   # In docker-compose.yml
   services:
     postgres:
       ports:
         - "5433:5432"  # Maps to localhost:5433
   ```

3. **Update .env to match**
   ```bash
   DB_PORT=5433
   ```

---

## Permission Errors

### EACCES: Permission Denied

**Error:** `EACCES: permission denied, mkdir '/path/to/directory'`

**Solutions:**

1. **Fix directory permissions**
   ```bash
   # macOS/Linux
   chmod -R 755 backend/src
   chmod +x backend/node_modules/.bin/*

   # Create missing directories
   mkdir -p logs
   mkdir -p uploads
   ```

2. **Avoid using sudo with npm**
   ```bash
   # Fix npm permissions instead
   mkdir -p ~/.npm-global
   npm config set prefix '~/.npm-global'
   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
   source ~/.bashrc
   ```

3. **Windows folder permissions**
   - Run terminal as Administrator
   - Check folder security settings
   - Disable antivirus temporarily for development folder

### File Write Errors

**Error:** Cannot write to log files or upload directories

**Solutions:**

1. **Create directories with proper permissions**
   ```bash
   mkdir -p logs uploads
   chmod 777 logs uploads  # Development only
   ```

2. **Check disk space**
   ```bash
   df -h  # macOS/Linux
   ```

3. **Verify path in .env**
   ```bash
   UPLOAD_DIR=uploads
   LOG_FILE_PATH=logs
   ```

---

## Test Failures

### Tests Fail with Module Not Found

**Error:** `Cannot find module '@core/services/...'`

**Solutions:**

1. **Rebuild TypeScript**
   ```bash
   cd backend
   npm run build
   ```

2. **Check tsconfig paths**
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@core/*": ["src/core/*"],
         "@infrastructure/*": ["src/infrastructure/*"],
         "@interfaces/*": ["src/interfaces/*"]
       }
     }
   }
   ```

3. **Clear Jest cache**
   ```bash
   npm run test:watch -- --clearCache
   ```

### Timeout Errors

**Error:** `Error: Timeout - Async callback was not invoked within the 5000ms timeout`

**Solutions:**

1. **Increase test timeout**
   ```javascript
   describe('Long running test', () => {
     jest.setTimeout(30000); // 30 seconds
     // ...
   });
   ```

2. **Fix async/await issues**
   ```javascript
   // Always await promises
   it('should work', async () => {
     await someAsyncOperation();  // Don't forget await!
   });
   ```

3. **Check for database locks**
   - Ensure tests use separate database
   - Run tests sequentially if needed: `jest --runInBand`

### Coverage Threshold Failures

**Error:** Coverage threshold not met

**Solutions:**

1. **Generate coverage report**
   ```bash
   npm run test:coverage
   ```

2. **Identify untested code**
   ```bash
   open coverage/lcov-report/index.html  # macOS
   start coverage/lcov-report/index.html  # Windows
   ```

3. **Add tests for missing coverage**
   - Focus on critical paths first
   - Add edge case tests
   - Test error handling

### Database Tests Fail

**Error:** Tests fail with database connection or constraint errors

**Solutions:**

1. **Use test database**
   ```bash
   # Create .env.test
   DB_NAME=patrolmanager_test
   ```

2. **Reset test database before tests**
   ```javascript
   beforeAll(async () => {
     await sequelize.sync({ force: true });
   });
   ```

3. **Clean up after tests**
   ```javascript
   afterEach(async () => {
     await User.truncate({ cascade: true });
   });
   ```

---

## Build Errors

### TypeScript Compilation Errors

**Error:** TS2345 or other TypeScript errors

**Solutions:**

1. **Check for type errors**
   ```bash
   cd backend
   npm run build
   ```

2. **Fix strict mode issues**
   - Add proper type annotations
   - Use `any` sparingly
   - Enable `strictNullChecks` for better error detection

3. **Clear TypeScript cache**
   ```bash
   rm -rf backend/dist
   rm -rf backend/node_modules/.cache
   npm run build
   ```

### CSS Build Errors

**Error:** Tailwind CSS build fails

**Solutions:**

1. **Reinstall dependencies**
   ```bash
   cd backend
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check Tailwind configuration**
   ```bash
   # Verify tailwind.config.js exists
   cat backend/tailwind.config.js
   ```

3. **Check input CSS file**
   ```bash
   # Verify source file exists
   ls backend/src/interfaces/web/public/assets/css/main.css
   ```

4. **Build with verbose output**
   ```bash
   npx tailwindcss -i ./src/interfaces/web/public/assets/css/main.css \
     -o ./src/interfaces/web/public/assets/css/dist.css --verbose
   ```

---

## WebSocket Issues

### Socket.io Connection Failures

**Error:** WebSocket connection fails or keeps reconnecting

**Solutions:**

1. **Check WebSocket is enabled**
   ```bash
   # In .env
   WS_ENABLED=true
   ```

2. **Verify CORS configuration**
   ```bash
   WS_CORS_ORIGIN=http://localhost:3000
   ```

3. **Check firewall settings**
   - Ensure WebSocket port is not blocked
   - Try disabling firewall temporarily

4. **Debug Socket.io**
   ```javascript
   // Client-side
   const socket = io({
     transports: ['websocket', 'polling'],
     reconnection: true,
     reconnectionAttempts: 5,
     reconnectionDelay: 1000
   });

   socket.on('connect_error', (error) => {
     console.error('Connection error:', error);
   });
   ```

### High CPU Usage from Socket.io

**Solutions:**

1. **Adjust ping timeout/interval**
   ```javascript
   const io = new Server(server, {
     pingTimeout: 30000,
     pingInterval: 10000
   });
   ```

2. **Limit concurrent connections**
   ```javascript
   io.engine.maxHttpBufferSize = 1e6; // 1MB
   ```

3. **Use Redis adapter for production**
   ```javascript
   const { createAdapter } = require('@socket.io/redis-adapter');
   const { createClient } = require('redis');

   const redisClient = createClient({ url: 'redis://localhost:6379' });
   io.adapter(createAdapter(redisClient));
   ```

---

## Authentication Problems

### JWT Token Invalid/Expired

**Error:** `JsonWebTokenError: invalid token` or `TokenExpiredError`

**Solutions:**

1. **Verify JWT_SECRET matches**
   ```bash
   # Check .env
   echo $JWT_SECRET
   ```

2. **Generate new token**
   ```javascript
   const token = jwt.sign(
     { userId: user.id, role: user.role },
     process.env.JWT_SECRET,
     { expiresIn: process.env.JWT_EXPIRES_IN }
   );
   ```

3. **Check token expiration**
   ```bash
   # Decode and check token
   echo "your_token" | jwt decode
   ```

4. **Implement refresh token flow**
   - Use short-lived access tokens
   - Store refresh tokens securely
   - Rotate tokens on refresh

### Session Not Persisting

**Error:** User gets logged out immediately

**Solutions:**

1. **Check session secret**
   ```bash
   SESSION_SECRET=your_secure_secret_min_32_characters
   ```

2. **Verify session store configuration**
   ```javascript
   const SequelizeStore = require('connect-session-sequelize')(session.Store);
   ```

3. **Check cookie settings**
   ```javascript
   app.use(session({
     cookie: {
       secure: false,  // Set true in production with HTTPS
       httpOnly: true,
       maxAge: 24 * 60 * 60 * 1000  // 24 hours
     }
   }));
   ```

---

## File Upload Issues

### File Size Limit Exceeded

**Error:** `PayloadTooLargeError: request entity too large`

**Solutions:**

1. **Increase upload size limit**
   ```bash
   # In .env
   MAX_FILE_SIZE=104857600  # 100MB
   ```

2. **Configure Express body parser**
   ```javascript
   app.use(express.json({ limit: '100mb' }));
   app.use(express.urlencoded({ limit: '100mb', extended: true }));
   ```

3. **Configure Multer**
   ```javascript
   const upload = multer({
     limits: {
       fileSize: 100 * 1024 * 1024  // 100MB
     }
   });
   ```

### File Type Not Allowed

**Error:** `MulterError: Unexpected file type`

**Solutions:**

1. **Check allowed file types**
   ```bash
   # In .env
   ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf
   ```

2. **Add file type validation**
   ```javascript
   const fileFilter = (req, file, cb) => {
     const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
     if (allowedTypes.includes(file.mimetype)) {
       cb(null, true);
     } else {
       cb(new Error('Invalid file type'), false);
     }
   };
   ```

---

## Performance Issues

### Slow API Response Times

**Solutions:**

1. **Enable query logging**
   ```bash
   DB_LOGGING=true
   ```

2. **Add database indexes**
   ```javascript
   // In migration
   await queryInterface.addIndex('Users', ['email']);
   await queryInterface.addIndex('PatrolRuns', ['guardId', 'startTime']);
   ```

3. **Use database connection pooling**
   ```bash
   DB_POOL_MAX=20
   ```

4. **Enable response compression**
   ```javascript
   app.use(compression());
   ```

5. **Implement caching**
   ```javascript
   const cache = new Map();
   app.get('/api/some-endpoint', cacheMiddleware, handler);
   ```

### High Memory Usage

**Solutions:**

1. **Monitor memory usage**
   ```javascript
   setInterval(() => {
     const used = process.memoryUsage();
     console.log(used);
   }, 10000);
   ```

2. **Fix memory leaks**
   - Remove unused event listeners
   - Clear intervals/timeouts
   - Limit cache size

3. **Use streams for large files**
   ```javascript
   const stream = fs.createReadStream(largeFile);
   stream.pipe(response);
   ```

---

## Deployment Issues

### PM2 Process Not Starting

**Solutions:**

1. **Check PM2 logs**
   ```bash
   pm2 logs patrolmanager
   pm2 show patrolmanager
   ```

2. **Verify ecosystem.config.js**
   ```javascript
   module.exports = {
     apps: [{
       name: 'patrolmanager',
       script: './dist/server.js',
       env: {
         NODE_ENV: 'production'
       }
     }]
   };
   ```

3. **Restart PM2**
   ```bash
   pm2 restart patrolmanager
   pm2 reload patrolmanager  # Zero-downtime
   ```

### Environment Variables Not Loading

**Solutions:**

1. **Verify .env exists in production**
   ```bash
   ls -la .env
   ```

2. **Check dotenv configuration**
   ```javascript
   import dotenv from 'dotenv';
   dotenv.config({ path: '.env' });
   ```

3. **Use PM2 ecosystem for env vars**
   ```javascript
   env_production: {
     NODE_ENV: 'production',
     PORT: 3000,
     DB_HOST: 'production-db-host'
   }
   ```

### Database Migration Failures in Production

**Solutions:**

1. **Backup database first**
   ```bash
   pg_dump -U patrolmanager patrolmanager > backup.sql
   ```

2. **Run migrations with rollback plan**
   ```bash
   npm run db:migrate
   # If fails:
   npm run db:migrate:undo
   ```

3. **Test migrations in staging first**
   ```bash
   # Always test in staging environment
   npm run db:migrate  # on staging
   ```

---

## Getting Additional Help

If you're still experiencing issues:

1. **Check logs**:
   ```bash
   # Application logs
   tail -f logs/app.log

   # Docker logs
   docker compose logs -f
   ```

2. **Enable debug mode**:
   ```bash
   DEBUG=* npm run dev
   ```

3. **Review existing issues**:
   - Check [GitHub Issues](https://github.com/your-org/patrol-manager/issues)
   - Search for similar problems

4. **Create a detailed bug report** including:
   - Environment details (OS, Node version)
   - Full error message and stack trace
   - Steps to reproduce
   - Expected vs actual behavior
   - Relevant configuration (redact secrets)

---

**Last Updated:** 2025-02-24

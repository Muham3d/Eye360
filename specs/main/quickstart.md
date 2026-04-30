# Quickstart: PatrolManager Environment Setup

Follow these steps to set up the development environment for the PatrolManager backend and mobile app.

## Backend Prerequisites
- **Node.js**: v18.x or v20.x
- **PostgreSQL**: v15+ (Local or Docker)
- **Redis**: v6+ (Required for Socket.io state)
- **TypeScript**: v5.3+

## Backend Setup (Local)
1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd PatrolManager/backend
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Environment Configuration**:
   Create a `.env` file in `backend/` based on `.env.example`:
   ```env
   DB_HOST=localhost
   DB_NAME=patrolmanager
   DB_USER=postgres
   DB_PASS=password
   JWT_SECRET=your_32_character_secret_here
   REDIS_URL=redis://localhost:6379
   STORAGE_TYPE=local
   UPLOAD_DIR=./uploads
   ```
4. **Run Database Migrations**:
   ```bash
   npx sequelize-cli db:migrate
   npx sequelize-cli db:seed:all
   ```
5. **Start the Development Server**:
   ```bash
   npm run dev
   ```

## Mobile Setup (Android)
1. **Open Android Studio**.
2. **Import the Project**: Select the `mobile/` directory.
3. **Sync Gradle**: Ensure all dependencies (Hilt, Room, Retrofit) are downloaded.
4. **Configure API Endpoint**:
   Update `NetworkConfig.kt` to point to your machine's local IP:
   ```kotlin
   const val BASE_URL = "http://192.168.1.XX:3000/api/"
   ```
5. **Run**: Deploy to a physical device (recommended for GPS/NFC testing) or Emulator.

## Testing
- Run all backend tests: `npm test`
- Run only auth tests: `npx jest --no-coverage tests/unit/services/AuthService.test.ts`

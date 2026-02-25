import { Sequelize } from 'sequelize';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'patrolmanager.sqlite');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false,
});

(async () => {
  try {
    const [sessions] = await sequelize.query('SELECT * FROM Sessions LIMIT 5');
    console.log('Sessions:', sessions);

    const [users] = await sequelize.query('SELECT id, email, status FROM users LIMIT 5');
    console.log('Users:', users);

    await sequelize.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();

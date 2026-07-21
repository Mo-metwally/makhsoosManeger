require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const sequelize = require('./config/db'); 

async function runMigrations() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connection to the database has been established successfully.');

    // إنشاء جدول التتبع للمايجريشنز (إذا لم يكن موجوداً)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
        "name" VARCHAR(255) PRIMARY KEY
      );
    `);

    const migrationsPath = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsPath)) {
      fs.mkdirSync(migrationsPath);
    }

    const files = fs.readdirSync(migrationsPath)
      .filter(f => f.endsWith('.js'))
      .sort();

    // جلب المايجريشنز التي تم تنفيذها مسبقاً
    const [executed] = await sequelize.query('SELECT "name" FROM "SequelizeMeta"');
    const executedNames = executed.map(e => e.name);

    let executedCount = 0;

    for (const file of files) {
      if (!executedNames.includes(file)) {
        console.log(`🚀 Running migration: ${file}`);
        const migration = require(path.join(migrationsPath, file));
        
        const queryInterface = sequelize.getQueryInterface();
        await migration.up(queryInterface, Sequelize);
        
        await sequelize.query('INSERT INTO "SequelizeMeta" ("name") VALUES (?)', { replacements: [file] });
        console.log(`✅ Migration ${file} executed successfully.\n`);
        executedCount++;
      }
    }

    if (executedCount === 0) {
      console.log('✨ No new migrations to run. Database is up to date.');
    } else {
      console.log(`🎉 Successfully executed ${executedCount} migrations.`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();

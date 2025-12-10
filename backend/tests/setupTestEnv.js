'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const dbPath = path.join(__dirname, 'test.db');
const testDatabaseUrl = `file:${dbPath}`;
process.env.DATABASE_URL = testDatabaseUrl;

const projectRoot = path.resolve(__dirname, '..');
const schemaPath = path.join(projectRoot, 'prisma', 'schema.prisma');

const ensureMigrations = () => {
    const dbExists = fs.existsSync(dbPath);
    if (!dbExists) {
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }

    execSync(`npx prisma migrate deploy --schema ${schemaPath}`, {
        cwd: projectRoot,
        stdio: 'inherit',
        env: {
            ...process.env,
            DATABASE_URL: testDatabaseUrl
        }
    });
};

ensureMigrations();

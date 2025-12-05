#!/usr/bin/env node
/**
 * Database Setup Script
 * 
 * This script detects the database type from DATABASE_URL and:
 * 1. Updates the Prisma schema provider if needed
 * 2. Generates the Prisma client
 * 
 * Usage: node scripts/setup-db.js
 * 
 * Environment variables:
 * - DATABASE_URL: The database connection string
 *   - SQLite: file:./dev.db
 *   - PostgreSQL: postgresql://user:password@host:5432/dbname
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load environment variables
require('dotenv').config();

const SCHEMA_PATH = path.join(__dirname, '..', 'prisma', 'schema.prisma');

function detectDatabaseProvider(databaseUrl) {
    if (!databaseUrl) {
        console.error('ERROR: DATABASE_URL environment variable is not set');
        process.exit(1);
    }

    if (databaseUrl.startsWith('file:') || databaseUrl.startsWith('sqlite:')) {
        return 'sqlite';
    }

    if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
        return 'postgresql';
    }

    console.error(`ERROR: Unsupported database URL format: ${databaseUrl}`);
    console.error('Supported formats:');
    console.error('  - SQLite: file:./dev.db');
    console.error('  - PostgreSQL: postgresql://user:password@host:5432/dbname');
    process.exit(1);
}

function updateSchemaProvider(schemaPath, provider) {
    let schema = fs.readFileSync(schemaPath, 'utf-8');

    // Match the datasource block and update the provider
    const datasourceRegex = /datasource\s+db\s*\{[^}]*provider\s*=\s*"[^"]*"[^}]*\}/s;
    const currentProviderMatch = schema.match(/provider\s*=\s*"([^"]*)"/);

    if (currentProviderMatch && currentProviderMatch[1] === provider) {
        console.log(`Schema already configured for ${provider}`);
        return false;
    }

    // Replace the provider in the datasource block
    schema = schema.replace(
        /provider\s*=\s*"[^"]*"/,
        `provider = "${provider}"`
    );

    fs.writeFileSync(schemaPath, schema);
    console.log(`Updated schema provider to: ${provider}`);
    return true;
}

function runPrismaGenerate() {
    console.log('Generating Prisma client...');
    try {
        // Use npm exec --no to ensure we only use locally installed prisma
        // This prevents network requests to npmjs.org
        execSync('npm exec --no -- prisma generate', {
            cwd: path.join(__dirname, '..'),
            stdio: 'inherit'
        });
        console.log('Prisma client generated successfully');
    } catch (error) {
        console.error('Failed to generate Prisma client:', error.message);
        process.exit(1);
    }
}

function main() {
    const databaseUrl = process.env.DATABASE_URL;
    console.log('Database Setup Script');
    console.log('=====================');

    const provider = detectDatabaseProvider(databaseUrl);
    console.log(`Detected database provider: ${provider}`);

    const schemaUpdated = updateSchemaProvider(SCHEMA_PATH, provider);

    // Always regenerate the client to ensure it matches the schema
    runPrismaGenerate();

    console.log('\nDatabase setup complete!');
    console.log(`Provider: ${provider}`);
    console.log(`Database URL: ${databaseUrl.replace(/\/\/[^@]*@/, '//***@')}`); // Hide credentials
}

main();

/*
 * Seed script to populate database with test data
 */
'use strict';

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    // Only seed if ENV_TYPE environment variable is set to 'local'
    if (process.env.ENV_TYPE !== 'local') {
        console.log('Skipping database seed (ENV_TYPE not set to "local")');
        return;
    }

    console.log('Seeding database...');

    // Create test users
    const password = await bcrypt.hash('TestPass123!', 12);

    // Create superuser
    await prisma.user.upsert({
        where: { utorid: 'superuser' },
        update: {},
        create: {
            utorid: 'superuser',
            name: 'Super User',
            email: 'super@mail.utoronto.ca',
            passwordBcrypt: password,
            role: 'superuser',
            isVerified: true,
            points: 1000
        }
    });

    // Create manager
    const manager = await prisma.user.upsert({
        where: { utorid: 'manager' },
        update: {},
        create: {
            utorid: 'manager',
            name: 'Test Manager',
            email: 'manager@mail.utoronto.ca',
            passwordBcrypt: password,
            role: 'manager',
            isVerified: true,
            points: 500
        }
    });

    // Create cashier
    await prisma.user.upsert({
        where: { utorid: 'cashier' },
        update: {},
        create: {
            utorid: 'cashier',
            name: 'Test Cashier',
            email: 'cashier@mail.utoronto.ca',
            passwordBcrypt: password,
            role: 'cashier',
            isVerified: true,
            suspicious: false,
            points: 250
        }
    });

    // Create regular user
    await prisma.user.upsert({
        where: { utorid: 'testuser' },
        update: {},
        create: {
            utorid: 'testuser',
            name: 'Test User',
            email: 'user@mail.utoronto.ca',
            passwordBcrypt: password,
            role: 'regular',
            isVerified: true,
            points: 100
        }
    });

    // Create test promotions
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    const autoPromo = await prisma.promotion.create({
        data: {
            name: 'Happy Hour Bonus',
            description: 'Get 50% extra points on all purchases',
            type: 'automatic',
            startTime: now,
            endTime: futureDate,
            rate: 0.5
        }
    });

    const oneTimePromo = await prisma.promotion.create({
        data: {
            name: 'Welcome Bonus',
            description: 'Get 50 bonus points on your first purchase over $10',
            type: 'onetime',
            startTime: now,
            endTime: futureDate,
            minSpending: 10.0,
            points: 50
        }
    });

    // Create test event
    const eventStart = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const eventEnd = new Date(eventStart.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

    const event = await prisma.event.create({
        data: {
            name: 'Tech Workshop',
            description: 'Learn about web development with modern frameworks',
            location: 'BA 1234',
            startTime: eventStart,
            endTime: eventEnd,
            capacity: 50,
            pointsTotal: 100,
            pointsRemain: 100,
            published: true,
            organizers: {
                create: [
                    { userId: manager.id }
                ]
            }
        }
    });

    console.log('✓ Database seeded successfully!');
    console.log('\nTest Accounts (all use password: TestPass123!):');
    console.log('  Superuser: superuser / super@mail.utoronto.ca');
    console.log('  Manager:   manager / manager@mail.utoronto.ca');
    console.log('  Cashier:   cashier / cashier@mail.utoronto.ca');
    console.log('  User:      testuser / user@mail.utoronto.ca');
    console.log('\nTest Promotions:');
    console.log(`  ID ${autoPromo.id}: ${autoPromo.name} (automatic)`);
    console.log(`  ID ${oneTimePromo.id}: ${oneTimePromo.name} (one-time)`);
    console.log('\nTest Event:');
    console.log(`  ID ${event.id}: ${event.name}`);
}

main()
    .catch((e) => {
        console.error('Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });


/*
 * Seed script to populate database with test data
 */
'use strict';

const fs = require('fs');
require('dotenv').config(
    {
        path: ['./', './../', './../../'].map((dir) => dir + '.env').filter((path) => {
            return fs.existsSync(path);
        })
    }
);
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    // Only seed if ENV_TYPE environment variable is set to 'local'
    if (process.env.ENV_TYPE !== 'local') {
        console.log('Skipping database seed (ENV_TYPE not set to "local")');
        return;
    }

    console.log('Clearing all database tables...');
    
    // Delete all data in correct order (respecting foreign key constraints)
    // 1. Delete junction/relation tables first
    console.log('  - Deleting TransactionPromotion...');
    await prisma.transactionPromotion.deleteMany({});
    
    console.log('  - Deleting UserPromotionUse...');
    await prisma.userPromotionUse.deleteMany({});
    
    console.log('  - Deleting EventGuest...');
    await prisma.eventGuest.deleteMany({});
    
    console.log('  - Deleting EventOrganizer...');
    await prisma.eventOrganizer.deleteMany({});
    
    console.log('  - Deleting Transaction...');
    await prisma.transaction.deleteMany({});
    
    console.log('  - Deleting ResetToken...');
    await prisma.resetToken.deleteMany({});
    
    // 2. Delete main tables
    console.log('  - Deleting Promotion...');
    await prisma.promotion.deleteMany({});
    
    console.log('  - Deleting Event...');
    await prisma.event.deleteMany({});
    
    console.log('  - Deleting User...');
    await prisma.user.deleteMany({});
    
    console.log('✓ All tables cleared successfully!\n');

    console.log('Creating test data...');
    const password = await bcrypt.hash('TestPass123!', 12);

    // Create superuser
    const superuser = await prisma.user.create({
        data: {
            utorid: 'supera82',
            name: 'Super User',
            email: 'super@mail.utoronto.ca',
            passwordBcrypt: password,
            role: 'superuser',
            isVerified: true,
            points: 1000
        }
    });

    // Create manager
    const manager = await prisma.user.create({
        data: {
            utorid: 'manag123',
            name: 'Test Manager',
            email: 'manager@mail.utoronto.ca',
            passwordBcrypt: password,
            role: 'manager',
            isVerified: true,
            points: 500
        }
    });

    // Create cashier
    const cashier = await prisma.user.create({
        data: {
            utorid: 'cashi123',
            name: 'Test Cashier',
            email: 'cashier@mail.utoronto.ca',
            passwordBcrypt: password,
            role: 'cashier',
            isVerified: true,
            suspicious: false,
            points: 250
        }
    });

    // Create regular users (at least 10 users total)
    const regularUsers = [];
    const userNames = [
        { utorid: 'testu123', name: 'Test User', email: 'user@mail.utoronto.ca', points: 100 },
        { utorid: 'john001', name: 'John Smith', email: 'john.smith@mail.utoronto.ca', points: 250 },
        { utorid: 'jane002', name: 'Jane Doe', email: 'jane.doe@mail.utoronto.ca', points: 180 },
        { utorid: 'alice03', name: 'Alice Johnson', email: 'alice.j@mail.utoronto.ca', points: 320 },
        { utorid: 'bob004', name: 'Bob Williams', email: 'bob.w@mail.utoronto.ca', points: 150 },
        { utorid: 'carol05', name: 'Carol Brown', email: 'carol.b@mail.utoronto.ca', points: 200 },
        { utorid: 'dave006', name: 'Dave Miller', email: 'dave.m@mail.utoronto.ca', points: 90 },
        { utorid: 'emma007', name: 'Emma Davis', email: 'emma.d@mail.utoronto.ca', points: 275 }
    ];

    for (const userData of userNames) {
        const user = await prisma.user.create({
            data: {
                utorid: userData.utorid,
                name: userData.name,
                email: userData.email,
                passwordBcrypt: password,
                role: 'regular',
                isVerified: true,
                points: userData.points
            }
        });
        regularUsers.push(user);
    }

    const testuser = regularUsers[0];

    // Create unverified users
    const unverifiedUser1 = await prisma.user.create({
        data: {
            utorid: 'unver001',
            name: 'Frank Wilson',
            email: 'frank.wilson@mail.utoronto.ca',
            passwordBcrypt: password,
            role: 'regular',
            isVerified: false,
            points: 0
        }
    });

    const unverifiedUser2 = await prisma.user.create({
        data: {
            utorid: 'unver002',
            name: 'Sarah Lee',
            email: 'sarah.lee@mail.utoronto.ca',
            passwordBcrypt: password,
            role: 'regular',
            isVerified: false,
            points: 0
        }
    });

    console.log('Creating test promotions (at least 5)...');
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const pastStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const midFutureDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

    const promotions = [];

    const autoPromo1 = await prisma.promotion.create({
        data: {
            name: 'Happy Hour Bonus',
            description: 'Get 50% extra points on all purchases',
            type: 'automatic',
            startTime: now,
            endTime: futureDate,
            rate: 0.5
        }
    });
    promotions.push(autoPromo1);

    const oneTimePromo1 = await prisma.promotion.create({
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
    promotions.push(oneTimePromo1);

    const autoPromo2 = await prisma.promotion.create({
        data: {
            name: 'Weekend Special',
            description: 'Double points on weekends',
            type: 'automatic',
            startTime: pastStartDate,
            endTime: futureDate,
            rate: 1.0
        }
    });
    promotions.push(autoPromo2);

    const oneTimePromo2 = await prisma.promotion.create({
        data: {
            name: 'Big Spender Reward',
            description: 'Get 100 bonus points when you spend $50 or more',
            type: 'onetime',
            startTime: now,
            endTime: midFutureDate,
            minSpending: 50.0,
            points: 100
        }
    });
    promotions.push(oneTimePromo2);

    const autoPromo3 = await prisma.promotion.create({
        data: {
            name: 'Loyalty Member Bonus',
            description: 'Extra 25% points for verified members',
            type: 'automatic',
            startTime: pastStartDate,
            endTime: futureDate,
            rate: 0.25
        }
    });
    promotions.push(autoPromo3);

    console.log('Creating test events (at least 5)...');
    const events = [];

    const event1 = await prisma.event.create({
        data: {
            name: 'Tech Workshop',
            description: 'Learn about web development with modern frameworks',
            location: 'BA 1234',
            startTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            endTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
            capacity: 50,
            pointsTotal: 100,
            pointsRemain: 60,
            published: true,
            organizers: {
                create: [
                    { userId: manager.id }
                ]
            }
        }
    });
    events.push(event1);

    const event2 = await prisma.event.create({
        data: {
            name: 'Hackathon 2025',
            description: '24-hour coding competition',
            location: 'MC 2525',
            startTime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
            endTime: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
            capacity: 100,
            pointsTotal: 200,
            pointsRemain: 200,
            published: true,
            organizers: {
                create: [
                    { userId: manager.id }
                ]
            }
        }
    });
    events.push(event2);

    const event3 = await prisma.event.create({
        data: {
            name: 'Networking Night',
            description: 'Meet professionals in tech industry',
            location: 'GB 202',
            startTime: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
            endTime: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
            capacity: 75,
            pointsTotal: 150,
            pointsRemain: 150,
            published: true,
            organizers: {
                create: [
                    { userId: manager.id }
                ]
            }
        }
    });
    events.push(event3);

    const event4 = await prisma.event.create({
        data: {
            name: 'Career Fair',
            description: 'Explore job opportunities',
            location: 'AC 223',
            startTime: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
            endTime: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
            capacity: 200,
            pointsTotal: 300,
            pointsRemain: 300,
            published: true,
            organizers: {
                create: [
                    { userId: manager.id }
                ]
            }
        }
    });
    events.push(event4);

    const event5 = await prisma.event.create({
        data: {
            name: 'Guest Speaker Series',
            description: 'Industry experts share insights',
            location: 'SF 1105',
            startTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
            endTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000),
            capacity: 60,
            pointsTotal: 80,
            pointsRemain: 45,
            published: true,
            organizers: {
                create: [
                    { userId: manager.id }
                ]
            }
        }
    });
    events.push(event5);

    console.log('Creating test transactions (at least 30, at least 2 of each type)...');
    const transactions = [];

    // Purchase transactions (at least 2)
    const purchase1 = await prisma.transaction.create({
        data: {
            userId: regularUsers[0].id,
            type: 'purchase',
            amount: 50,
            spent: 25.0,
            createdById: cashier.id,
            promotions: {
                create: [
                    { promotionId: autoPromo1.id }
                ]
            }
        }
    });
    transactions.push(purchase1);

    const purchase2 = await prisma.transaction.create({
        data: {
            userId: regularUsers[1].id,
            type: 'purchase',
            amount: 100,
            spent: 50.0,
            createdById: cashier.id,
            promotions: {
                create: [
                    { promotionId: autoPromo2.id }
                ]
            }
        }
    });
    transactions.push(purchase2);

    const purchase3 = await prisma.transaction.create({
        data: {
            userId: regularUsers[2].id,
            type: 'purchase',
            amount: 75,
            spent: 30.0,
            createdById: cashier.id
        }
    });
    transactions.push(purchase3);

    const purchase4 = await prisma.transaction.create({
        data: {
            userId: regularUsers[3].id,
            type: 'purchase',
            amount: 120,
            spent: 60.0,
            createdById: cashier.id,
            promotions: {
                create: [
                    { promotionId: autoPromo3.id },
                    { promotionId: autoPromo1.id }
                ]
            }
        }
    });
    transactions.push(purchase4);

    const purchase5 = await prisma.transaction.create({
        data: {
            userId: regularUsers[4].id,
            type: 'purchase',
            amount: 80,
            spent: 40.0,
            createdById: cashier.id
        }
    });
    transactions.push(purchase5);

    // Redemption transactions (at least 2)
    const redemption1 = await prisma.transaction.create({
        data: {
            userId: regularUsers[0].id,
            type: 'redemption',
            amount: -30,
            redeemed: 30,
            processedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
            processedById: cashier.id,
            createdById: regularUsers[0].id
        }
    });
    transactions.push(redemption1);

    const redemption2 = await prisma.transaction.create({
        data: {
            userId: regularUsers[1].id,
            type: 'redemption',
            amount: -50,
            redeemed: 50,
            processedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
            processedById: cashier.id,
            createdById: regularUsers[1].id
        }
    });
    transactions.push(redemption2);

    const redemption3 = await prisma.transaction.create({
        data: {
            userId: regularUsers[2].id,
            type: 'redemption',
            amount: -25,
            redeemed: 25,
            processedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
            processedById: cashier.id,
            createdById: regularUsers[2].id
        }
    });
    transactions.push(redemption3);

    // Adjustment transactions (at least 2)
    const adjustment1 = await prisma.transaction.create({
        data: {
            userId: regularUsers[3].id,
            type: 'adjustment',
            amount: 50,
            createdById: manager.id,
            remark: 'Points adjustment for customer service issue'
        }
    });
    transactions.push(adjustment1);

    const adjustment2 = await prisma.transaction.create({
        data: {
            userId: regularUsers[4].id,
            type: 'adjustment',
            amount: -20,
            createdById: manager.id,
            remark: 'Correction for previous transaction error'
        }
    });
    transactions.push(adjustment2);

    const adjustment3 = await prisma.transaction.create({
        data: {
            userId: regularUsers[0].id,
            type: 'adjustment',
            amount: 100,
            createdById: manager.id,
            relatedId: purchase1.id,
            remark: 'Bonus points for special promotion',
            suspicious: false
        }
    });
    transactions.push(adjustment3);

    // Event transactions (at least 2)
    const eventTx1 = await prisma.transaction.create({
        data: {
            userId: regularUsers[0].id,
            type: 'event',
            amount: 40,
            createdById: manager.id,
            relatedId: event1.id,
            remark: 'Points awarded for attending Tech Workshop'
        }
    });
    transactions.push(eventTx1);

    const eventTx2 = await prisma.transaction.create({
        data: {
            userId: regularUsers[1].id,
            type: 'event',
            amount: 40,
            createdById: manager.id,
            relatedId: event1.id,
            remark: 'Points awarded for attending Tech Workshop'
        }
    });
    transactions.push(eventTx2);

    const eventTx3 = await prisma.transaction.create({
        data: {
            userId: regularUsers[5].id,
            type: 'event',
            amount: 35,
            createdById: manager.id,
            relatedId: event5.id,
            remark: 'Points awarded for attending Guest Speaker Series'
        }
    });
    transactions.push(eventTx3);

    // Transfer transactions (at least 2 pairs = 4 transactions)
    const transfer1Sender = await prisma.transaction.create({
        data: {
            userId: regularUsers[2].id,
            type: 'transfer',
            amount: -30,
            relatedId: regularUsers[3].id,
            createdById: regularUsers[2].id,
            remark: 'Transfer to friend'
        }
    });
    transactions.push(transfer1Sender);

    const transfer1Receiver = await prisma.transaction.create({
        data: {
            userId: regularUsers[3].id,
            type: 'transfer',
            amount: 30,
            relatedId: regularUsers[2].id,
            createdById: regularUsers[2].id,
            remark: 'Transfer from friend'
        }
    });
    transactions.push(transfer1Receiver);

    const transfer2Sender = await prisma.transaction.create({
        data: {
            userId: regularUsers[4].id,
            type: 'transfer',
            amount: -50,
            relatedId: regularUsers[5].id,
            createdById: regularUsers[4].id,
            remark: 'Gift points'
        }
    });
    transactions.push(transfer2Sender);

    const transfer2Receiver = await prisma.transaction.create({
        data: {
            userId: regularUsers[5].id,
            type: 'transfer',
            amount: 50,
            relatedId: regularUsers[4].id,
            createdById: regularUsers[4].id,
            remark: 'Received gift points'
        }
    });
    transactions.push(transfer2Receiver);

    // More transactions to reach at least 30 total
    const morePurchases = [
        { userIdx: 5, amount: 60, spent: 30.0 },
        { userIdx: 6, amount: 90, spent: 45.0 },
        { userIdx: 7, amount: 110, spent: 55.0 },
        { userIdx: 0, amount: 70, spent: 35.0 },
        { userIdx: 1, amount: 85, spent: 42.5 }
    ];

    for (const purchase of morePurchases) {
        const tx = await prisma.transaction.create({
            data: {
                userId: regularUsers[purchase.userIdx].id,
                type: 'purchase',
                amount: purchase.amount,
                spent: purchase.spent,
                createdById: cashier.id
            }
        });
        transactions.push(tx);
    }

    const moreRedemptions = [
        { userIdx: 3, redeemed: 40 },
        { userIdx: 6, redeemed: 35 },
        { userIdx: 7, redeemed: 45 }
    ];

    for (const redemption of moreRedemptions) {
        const tx = await prisma.transaction.create({
            data: {
                userId: regularUsers[redemption.userIdx].id,
                type: 'redemption',
                amount: -redemption.redeemed,
                redeemed: redemption.redeemed,
                processedAt: new Date(now.getTime() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000),
                processedById: cashier.id,
                createdById: regularUsers[redemption.userIdx].id
            }
        });
        transactions.push(tx);
    }

    const moreAdjustments = [
        { userIdx: 5, amount: 25, remark: 'Loyalty bonus' },
        { userIdx: 6, amount: -15, remark: 'Correction' }
    ];

    for (const adjustment of moreAdjustments) {
        const tx = await prisma.transaction.create({
            data: {
                userId: regularUsers[adjustment.userIdx].id,
                type: 'adjustment',
                amount: adjustment.amount,
                createdById: manager.id,
                remark: adjustment.remark
            }
        });
        transactions.push(tx);
    }

    // More event transactions
    const moreEventTxs = [
        { userIdx: 2, eventIdx: 1, amount: 40 },
        { userIdx: 3, eventIdx: 1, amount: 40 },
        { userIdx: 4, eventIdx: 4, amount: 50 }
    ];

    for (const eventTx of moreEventTxs) {
        const tx = await prisma.transaction.create({
            data: {
                userId: regularUsers[eventTx.userIdx].id,
                type: 'event',
                amount: eventTx.amount,
                createdById: manager.id,
                relatedId: events[eventTx.eventIdx].id,
                remark: `Points awarded for attending ${events[eventTx.eventIdx].name}`
            }
        });
        transactions.push(tx);
    }

    // Add some event guests and organizers
    await prisma.eventGuest.create({
        data: {
            eventId: event1.id,
            userId: regularUsers[0].id,
            confirmed: true
        }
    });

    await prisma.eventGuest.create({
        data: {
            eventId: event1.id,
            userId: regularUsers[1].id,
            confirmed: true
        }
    });

    await prisma.eventGuest.create({
        data: {
            eventId: event5.id,
            userId: regularUsers[5].id,
            confirmed: true
        }
    });

    console.log('✓ Database seeded successfully!');
    console.log('\nTest Accounts (all use password: TestPass123!):');
    console.log('  Superuser: supera82 / super@mail.utoronto.ca');
    console.log('  Manager:   manag123 / manager@mail.utoronto.ca');
    console.log('  Cashier:   cashi123 / cashier@mail.utoronto.ca');
    console.log('  Regular Users (Verified):');
    regularUsers.forEach(user => {
        console.log(`    ${user.utorid} / ${user.email} (${user.points} points)`);
    });
    console.log('  Unverified Users:');
    console.log(`    ${unverifiedUser1.utorid} / ${unverifiedUser1.email} (${unverifiedUser1.points} points, not verified)`);
    console.log(`    ${unverifiedUser2.utorid} / ${unverifiedUser2.email} (${unverifiedUser2.points} points, not verified)`);
    console.log('\nPromotions:');
    promotions.forEach(promo => {
        console.log(`  ID ${promo.id}: ${promo.name} (${promo.type})`);
    });
    console.log('\nEvents:');
    events.forEach(event => {
        console.log(`  ID ${event.id}: ${event.name} (${event.published ? 'published' : 'draft'})`);
    });
    console.log(`\nTotal Transactions Created: ${transactions.length}`);
    console.log('Transaction Types:');
    const typeCounts = transactions.reduce((acc, tx) => {
        acc[tx.type] = (acc[tx.type] || 0) + 1;
        return acc;
    }, {});
    Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
    });
}

main()
    .catch((e) => {
        console.error('Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });


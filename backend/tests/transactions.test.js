'use strict';

require('./setupTestEnv');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app, prisma } = require('..');
const { clearDatabase, createUserWithRole } = require('./helpers/db');

const JWT_SECRET = process.env.JWT_SECRET;

const getToken = (user) => jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '2h' });

describe('Transaction Endpoints', () => {
    let manager, cashier, regular, regular2;
    let managerToken, cashierToken, regularToken, regular2Token;

    beforeAll(async () => {
        await clearDatabase();

        const m = await createUserWithRole('manager', { utorid: 'manager1' });
        manager = m.user;
        managerToken = getToken(manager);

        const c = await createUserWithRole('cashier', { utorid: 'cashier1' });
        cashier = c.user;
        cashierToken = getToken(cashier);

        const r = await createUserWithRole('regular', { utorid: 'regular1', points: 1000 });
        regular = r.user;
        regularToken = getToken(regular);

        const r2 = await createUserWithRole('regular', { utorid: 'regular2', points: 500 });
        regular2 = r2.user;
        regular2Token = getToken(regular2);
    });

    afterAll(async () => {
        await clearDatabase();
        await prisma.$disconnect();
    });

    describe('POST /transactions', () => {
        test('cashier can create purchase transaction', async () => {
            const res = await request(app)
                .post('/transactions')
                .set('Authorization', `Bearer ${cashierToken}`)
                .send({
                    utorid: regular.utorid,
                    type: 'purchase',
                    spent: 100,
                    remark: 'Test purchase'
                });

            expect(res.status).toBe(201);
            expect(res.body.type).toBe('purchase');
            expect(res.body.spent).toBe(100);
            expect(res.body.earned).toBeGreaterThan(0);
        });

        test('manager can create adjustment transaction', async () => {
            const res = await request(app)
                .post('/transactions')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                    utorid: regular.utorid,
                    type: 'adjustment',
                    amount: 50,
                    remark: 'Test adjustment'
                });

            expect(res.status).toBe(201);
            expect(res.body.type).toBe('adjustment');
            expect(res.body.amount).toBe(50);
        });

        test('cashier cannot create adjustment transaction', async () => {
            const res = await request(app)
                .post('/transactions')
                .set('Authorization', `Bearer ${cashierToken}`)
                .send({
                    utorid: regular.utorid,
                    type: 'adjustment',
                    amount: 50,
                    relatedId: 1,
                    remark: 'Test adjustment'
                });

            expect(res.status).toBe(403);
        });

        test('regular user cannot create transactions', async () => {
            const res = await request(app)
                .post('/transactions')
                .set('Authorization', `Bearer ${regularToken}`)
                .send({
                    utorid: regular2.utorid,
                    type: 'purchase',
                    spent: 50
                });

            expect(res.status).toBe(403);
        });

        test('rejects invalid transaction type', async () => {
            const res = await request(app)
                .post('/transactions')
                .set('Authorization', `Bearer ${cashierToken}`)
                .send({
                    utorid: regular.utorid,
                    type: 'invalid_type',
                    spent: 100
                });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /transactions', () => {
        test('manager can list all transactions', async () => {
            const res = await request(app)
                .get('/transactions')
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('results');
            expect(res.body).toHaveProperty('count');
            expect(Array.isArray(res.body.results)).toBe(true);
        });

        test('manager can filter transactions by type', async () => {
            const res = await request(app)
                .get('/transactions?type=purchase')
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(200);
            res.body.results.forEach(t => {
                expect(t.type).toBe('purchase');
            });
        });

        test('cashier cannot list all transactions', async () => {
            const res = await request(app)
                .get('/transactions')
                .set('Authorization', `Bearer ${cashierToken}`);

            expect(res.status).toBe(403);
        });
    });

    describe('GET /transactions/:transactionId', () => {
        let transactionId;

        beforeAll(async () => {
            const txn = await prisma.transaction.create({
                data: {
                    user: { connect: { id: regular.id } },
                    type: 'purchase',
                    spent: 200,
                    amount: 20,
                    remark: 'Test for GET',
                    createdBy: { connect: { id: cashier.id } }
                }
            });
            transactionId = txn.id;
        });

        test('cashier can view transaction details', async () => {
            const res = await request(app)
                .get(`/transactions/${transactionId}`)
                .set('Authorization', `Bearer ${cashierToken}`);

            expect(res.status).toBe(200);
            expect(res.body.id).toBe(transactionId);
            expect(res.body.type).toBe('purchase');
        });

        test('returns 404 for non-existent transaction', async () => {
            const res = await request(app)
                .get('/transactions/999999')
                .set('Authorization', `Bearer ${cashierToken}`);

            expect(res.status).toBe(404);
        });

        test('regular user cannot view other transactions', async () => {
            const res = await request(app)
                .get(`/transactions/${transactionId}`)
                .set('Authorization', `Bearer ${regularToken}`);

            expect(res.status).toBe(403);
        });
    });

    describe('PATCH /transactions/:transactionId/suspicious', () => {
        let transactionId;

        beforeAll(async () => {
            const txn = await prisma.transaction.create({
                data: {
                    user: { connect: { id: regular.id } },
                    type: 'purchase',
                    spent: 300,
                    amount: 30,
                    remark: 'Test for suspicious',
                    createdBy: { connect: { id: cashier.id } }
                }
            });
            transactionId = txn.id;
        });

        test('manager can mark transaction as suspicious', async () => {
            const res = await request(app)
                .patch(`/transactions/${transactionId}/suspicious`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({ suspicious: true });

            expect(res.status).toBe(200);
            expect(res.body.suspicious).toBe(true);
        });

        test('manager can unmark transaction as suspicious', async () => {
            const res = await request(app)
                .patch(`/transactions/${transactionId}/suspicious`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({ suspicious: false });

            expect(res.status).toBe(200);
            expect(res.body.suspicious).toBe(false);
        });

        test('cashier cannot mark transaction as suspicious', async () => {
            const res = await request(app)
                .patch(`/transactions/${transactionId}/suspicious`)
                .set('Authorization', `Bearer ${cashierToken}`)
                .send({ suspicious: true });

            expect(res.status).toBe(403);
        });
    });

    describe('POST /users/me/transactions (redemption)', () => {
        beforeAll(async () => {
            // Give user enough points
            await prisma.user.update({
                where: { id: regular.id },
                data: { points: 5000 }
            });
        });

        test('user can redeem points', async () => {
            const res = await request(app)
                .post('/users/me/transactions')
                .set('Authorization', `Bearer ${regularToken}`)
                .send({
                    type: 'redemption',
                    amount: 100,
                    remark: 'Test redemption'
                });

            expect(res.status).toBe(201);
            expect(res.body.type).toBe('redemption');
            expect(res.body.amount).toBe(100);
        });

        test('cannot redeem more points than available', async () => {
            const res = await request(app)
                .post('/users/me/transactions')
                .set('Authorization', `Bearer ${regularToken}`)
                .send({
                    type: 'redemption',
                    amount: 999999,
                    remark: 'Too many points'
                });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /users/me/transactions', () => {
        test('user can view own transactions', async () => {
            const res = await request(app)
                .get('/users/me/transactions')
                .set('Authorization', `Bearer ${regularToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('results');
            expect(Array.isArray(res.body.results)).toBe(true);
        });

        test('supports pagination', async () => {
            const res = await request(app)
                .get('/users/me/transactions?page=1&limit=5')
                .set('Authorization', `Bearer ${regularToken}`);

            expect(res.status).toBe(200);
            expect(res.body.results.length).toBeLessThanOrEqual(5);
        });
    });

    describe('POST /users/:userId/transactions (transfer)', () => {
        beforeAll(async () => {
            await prisma.user.update({
                where: { id: regular.id },
                data: { points: 1000 }
            });
        });

        test('user can transfer points to another user', async () => {
            const res = await request(app)
                .post(`/users/${regular2.id}/transactions`)
                .set('Authorization', `Bearer ${regularToken}`)
                .send({
                    type: 'transfer',
                    amount: 100,
                    remark: 'Gift transfer'
                });

            expect(res.status).toBe(201);
            expect(res.body.type).toBe('transfer');
            expect(res.body.sent).toBe(100);  // API returns 'sent' not 'amount'
        });

        test('cannot transfer more points than available', async () => {
            const res = await request(app)
                .post(`/users/${regular2.id}/transactions`)
                .set('Authorization', `Bearer ${regularToken}`)
                .send({
                    type: 'transfer',
                    amount: 999999,
                    remark: 'Too much'
                });

            expect(res.status).toBe(400);
        });

        test('self-transfer still works (API allows it)', async () => {
            const res = await request(app)
                .post(`/users/${regular.id}/transactions`)
                .set('Authorization', `Bearer ${regularToken}`)
                .send({
                    type: 'transfer',
                    amount: 50,
                    remark: 'Self transfer'
                });

            // API allows self-transfer
            expect(res.status).toBe(201);
        });
    });

    describe('PATCH /transactions/:transactionId/processed', () => {
        let redemptionId;

        beforeAll(async () => {
            // Ensure user has enough points
            await prisma.user.update({
                where: { id: regular.id },
                data: { points: 1000 }
            });

            const txn = await prisma.transaction.create({
                data: {
                    user: { connect: { id: regular.id } },
                    type: 'redemption',
                    amount: 0,  // Not processed yet
                    redeemed: 50,  // The amount to be redeemed when processed
                    remark: 'Test for processed',
                    createdBy: { connect: { id: regular.id } }
                }
            });
            redemptionId = txn.id;
        });

        test('cashier can mark redemption as processed', async () => {
            const res = await request(app)
                .patch(`/transactions/${redemptionId}/processed`)
                .set('Authorization', `Bearer ${cashierToken}`)
                .send({ processed: true });

            expect(res.status).toBe(200);
            expect(res.body.processedBy).toBe(cashier.utorid);
        });

        test('regular user cannot mark as processed', async () => {
            const txn = await prisma.transaction.create({
                data: {
                    user: { connect: { id: regular.id } },
                    type: 'redemption',
                    amount: 0,
                    redeemed: 25,
                    remark: 'Another redemption',
                    createdBy: { connect: { id: regular.id } }
                }
            });

            const res = await request(app)
                .patch(`/transactions/${txn.id}/processed`)
                .set('Authorization', `Bearer ${regularToken}`)
                .send({ processed: true });

            expect(res.status).toBe(403);
        });
    });
});

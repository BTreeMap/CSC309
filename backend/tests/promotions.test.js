'use strict';

require('./setupTestEnv');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app, prisma } = require('..');
const { clearDatabase, createUserWithRole } = require('./helpers/db');

const JWT_SECRET = process.env.JWT_SECRET;

const getToken = (user) => jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '2h' });

describe('Promotion Endpoints', () => {
    let manager, regular;
    let managerToken, regularToken;
    let testPromotion;

    beforeAll(async () => {
        await clearDatabase();
        
        const m = await createUserWithRole('manager', { utorid: 'promomgr' });
        manager = m.user;
        managerToken = getToken(manager);

        const r = await createUserWithRole('regular', { utorid: 'promoreg', points: 1000 });
        regular = r.user;
        regularToken = getToken(regular);
    });

    afterAll(async () => {
        await clearDatabase();
        await prisma.$disconnect();
    });

    describe('POST /promotions', () => {
        test('manager can create automatic promotion', async () => {
            const startTime = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
            const endTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            const res = await request(app)
                .post('/promotions')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                    name: 'Test Automatic Promo',
                    description: 'Double points on purchases',
                    type: 'automatic',
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString(),
                    rate: 2.0,
                    minSpending: 50
                });

            expect(res.status).toBe(201);
            expect(res.body.name).toBe('Test Automatic Promo');
            expect(res.body.type).toBe('automatic');
            expect(res.body.rate).toBe(2.0);
            testPromotion = res.body;
        });

        test('manager can create one-time promotion', async () => {
            const startTime = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
            const endTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            const res = await request(app)
                .post('/promotions')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                    name: 'Test One-Time Promo',
                    description: 'Bonus points once',
                    type: 'one-time',
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString(),
                    points: 100
                });

            expect(res.status).toBe(201);
            expect(res.body.type).toBe('one-time');
            expect(res.body.points).toBe(100);
        });

        test('regular user cannot create promotion', async () => {
            const startTime = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
            const endTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            const res = await request(app)
                .post('/promotions')
                .set('Authorization', `Bearer ${regularToken}`)
                .send({
                    name: 'Unauthorized Promo',
                    description: 'Should fail',
                    type: 'automatic',
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString()
                });

            expect(res.status).toBe(403);
        });

        test('rejects promotion with end time before start time', async () => {
            const startTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            const endTime = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);

            const res = await request(app)
                .post('/promotions')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                    name: 'Invalid Promo',
                    description: 'Bad times',
                    type: 'automatic',
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString()
                });

            expect(res.status).toBe(400);
        });

        test('rejects promotion with start time in the past', async () => {
            const startTime = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
            const endTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            const res = await request(app)
                .post('/promotions')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                    name: 'Past Promo',
                    description: 'Start in past',
                    type: 'automatic',
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString()
                });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /promotions', () => {
        test('authenticated user can list promotions', async () => {
            const res = await request(app)
                .get('/promotions')
                .set('Authorization', `Bearer ${regularToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('results');
            expect(Array.isArray(res.body.results)).toBe(true);
        });

        test('can filter promotions by name', async () => {
            const res = await request(app)
                .get('/promotions?name=Test')
                .set('Authorization', `Bearer ${regularToken}`);

            expect(res.status).toBe(200);
        });

        test('can filter promotions by type', async () => {
            const res = await request(app)
                .get('/promotions?type=automatic')
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(200);
        });

        test('supports pagination', async () => {
            const res = await request(app)
                .get('/promotions?page=1&limit=5')
                .set('Authorization', `Bearer ${regularToken}`);

            expect(res.status).toBe(200);
            expect(res.body.results.length).toBeLessThanOrEqual(5);
        });

        test('manager sees all promotions including future ones', async () => {
            const res = await request(app)
                .get('/promotions')
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(200);
            // Manager should see promotions that haven't started yet
        });
    });

    describe('GET /promotions/:promotionId', () => {
        test('can view promotion details', async () => {
            // Managers can view any promotion, even if not active yet
            const res = await request(app)
                .get(`/promotions/${testPromotion.id}`)
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.id).toBe(testPromotion.id);
            expect(res.body.name).toBe('Test Automatic Promo');
        });

        test('regular user cannot view inactive promotion', async () => {
            const res = await request(app)
                .get(`/promotions/${testPromotion.id}`)
                .set('Authorization', `Bearer ${regularToken}`);

            // Promotion hasn't started yet, regular user can't view
            expect(res.status).toBe(404);
        });

        test('returns 404 for non-existent promotion', async () => {
            const res = await request(app)
                .get('/promotions/999999')
                .set('Authorization', `Bearer ${regularToken}`);

            expect(res.status).toBe(404);
        });
    });

    describe('PATCH /promotions/:promotionId', () => {
        test('manager can update promotion', async () => {
            const res = await request(app)
                .patch(`/promotions/${testPromotion.id}`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                    name: 'Updated Automatic Promo',
                    rate: 2.5
                });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated Automatic Promo');
            expect(res.body.rate).toBe(2.5);
        });

        test('can update promotion description', async () => {
            const res = await request(app)
                .patch(`/promotions/${testPromotion.id}`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                    description: 'Updated description'
                });

            expect(res.status).toBe(200);
            expect(res.body.description).toBe('Updated description');
        });

        test('regular user cannot update promotion', async () => {
            const res = await request(app)
                .patch(`/promotions/${testPromotion.id}`)
                .set('Authorization', `Bearer ${regularToken}`)
                .send({ name: 'Hacked Promo' });

            expect(res.status).toBe(403);
        });

        test('returns 404 for non-existent promotion', async () => {
            const res = await request(app)
                .patch('/promotions/999999')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({ name: 'Ghost Promo' });

            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /promotions/:promotionId', () => {
        let promoToDelete;

        beforeAll(async () => {
            const startTime = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
            const endTime = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000);

            const res = await request(app)
                .post('/promotions')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                    name: 'Promo to Delete',
                    description: 'Will be deleted',
                    type: 'automatic',
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString()
                });

            promoToDelete = res.body;
        });

        test('manager can delete promotion', async () => {
            const res = await request(app)
                .delete(`/promotions/${promoToDelete.id}`)
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(204);
        });

        test('regular user cannot delete promotion', async () => {
            const res = await request(app)
                .delete(`/promotions/${testPromotion.id}`)
                .set('Authorization', `Bearer ${regularToken}`);

            expect(res.status).toBe(403);
        });

        test('returns 404 for non-existent promotion', async () => {
            const res = await request(app)
                .delete('/promotions/999999')
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(404);
        });
    });
});

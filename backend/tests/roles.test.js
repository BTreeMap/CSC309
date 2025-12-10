'use strict';

const request = require('supertest');
const { app, prisma } = require('..');
const { clearDatabase, createUserWithRole } = require('./helpers/db');

const login = async (utorid, password) => {
    const res = await request(app)
        .post('/auth/tokens')
        .send({ utorid, password });
    return res.body.token;
};

beforeEach(async () => {
    await clearDatabase();
});

afterAll(async () => {
    await prisma.$disconnect();
});

test('cashier can create purchase transaction, regular is forbidden', async () => {
    const { user: cashier, password: cashierPass } = await createUserWithRole('cashier');
    const { user: targetUser } = await createUserWithRole('regular');

    const cashierToken = await login(cashier.utorid, cashierPass);

    const okRes = await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ utorid: targetUser.utorid, type: 'purchase', spent: 10 });

    expect(okRes.status).toBe(201);
    expect(okRes.body).toHaveProperty('utorid', targetUser.utorid);

    const { user: regular, password: regularPass } = await createUserWithRole('regular');
    const regularToken = await login(regular.utorid, regularPass);

    const forbiddenRes = await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ utorid: targetUser.utorid, type: 'purchase', spent: 10 });

    expect(forbiddenRes.status).toBe(403);
});

test('manager can list transactions while cashier is forbidden', async () => {
    const { user: manager, password: managerPass } = await createUserWithRole('manager');
    const managerToken = await login(manager.utorid, managerPass);

    const managerRes = await request(app)
        .get('/transactions')
        .set('Authorization', `Bearer ${managerToken}`);

    expect(managerRes.status).toBe(200);
    expect(managerRes.body).toHaveProperty('results');

    const { user: cashier, password: cashierPass } = await createUserWithRole('cashier');
    const cashierToken = await login(cashier.utorid, cashierPass);

    const forbiddenRes = await request(app)
        .get('/transactions')
        .set('Authorization', `Bearer ${cashierToken}`);

    expect(forbiddenRes.status).toBe(403);
});

test('manager required for promotions and events creation', async () => {
    const { user: manager, password: managerPass } = await createUserWithRole('manager');
    const managerToken = await login(manager.utorid, managerPass);

    const start = new Date(Date.now() + 3600000).toISOString();
    const end = new Date(Date.now() + 7200000).toISOString();

    const promoRes = await request(app)
        .post('/promotions')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
            name: 'Test Promo',
            description: 'Desc',
            type: 'automatic',
            startTime: start,
            endTime: end,
            rate: 0.5
        });

    expect(promoRes.status).toBe(201);

    const eventRes = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
            name: 'Test Event',
            description: 'Desc',
            location: 'Hall',
            startTime: start,
            endTime: end,
            capacity: 10,
            points: 100
        });

    expect(eventRes.status).toBe(201);

    const { user: cashier, password: cashierPass } = await createUserWithRole('cashier');
    const cashierToken = await login(cashier.utorid, cashierPass);

    const promoForbidden = await request(app)
        .post('/promotions')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
            name: 'Fail Promo',
            description: 'Desc',
            type: 'automatic',
            startTime: start,
            endTime: end,
            rate: 0.5
        });

    expect(promoForbidden.status).toBe(403);

    const eventForbidden = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
            name: 'Fail Event',
            description: 'Desc',
            location: 'Hall',
            startTime: start,
            endTime: end,
            capacity: 10,
            points: 100
        });

    expect(eventForbidden.status).toBe(403);
});

'use strict';

const request = require('supertest');
const { app, prisma } = require('..');
const { clearDatabase, createUserWithRole } = require('./helpers/db');

beforeEach(async () => {
    await clearDatabase();
});

afterAll(async () => {
    await prisma.$disconnect();
});

test('POST /auth/tokens returns token and expiry for valid credentials', async () => {
    const { user, password } = await createUserWithRole('regular');

    const res = await request(app)
        .post('/auth/tokens')
        .send({ utorid: user.utorid, password });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(typeof res.body.expiresAt).toBe('string');
});

test('POST /auth/tokens rejects invalid credentials with 401', async () => {
    const { user } = await createUserWithRole('regular');

    const res = await request(app)
        .post('/auth/tokens')
        .send({ utorid: user.utorid, password: 'WrongPass123!' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Invalid credentials');
});

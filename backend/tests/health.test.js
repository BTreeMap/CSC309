'use strict';

const request = require('supertest');
const { app, prisma } = require('..');
const { clearDatabase } = require('./helpers/db');

beforeEach(async () => {
    await clearDatabase();
});

afterAll(async () => {
    await prisma.$disconnect();
});

test('GET /health responds with ok status payload', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
});

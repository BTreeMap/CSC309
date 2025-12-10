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

test('manager can list users, regular user is forbidden', async () => {
    const { user: manager, password: managerPass } = await createUserWithRole('manager');
    const { user: regular, password: regularPass } = await createUserWithRole('regular');

    const managerToken = await login(manager.utorid, managerPass);
    const regularToken = await login(regular.utorid, regularPass);

    const managerRes = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${managerToken}`);

    expect(managerRes.status).toBe(200);
    expect(managerRes.body).toHaveProperty('results');
    expect(Array.isArray(managerRes.body.results)).toBe(true);

    const regularRes = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${regularToken}`);

    expect(regularRes.status).toBe(403);
});

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

test('POST /auth/resets blocks default superuser account', async () => {
    const res = await request(app)
        .post('/auth/resets')
        .send({ utorid: 'superadm' });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error', 'Password reset is disabled for this account');
});

test('password reset flow issues token and allows new login', async () => {
    const { user, password } = await createUserWithRole('regular');

    // request reset token
    const resetRes = await request(app)
        .post('/auth/resets')
        .send({ utorid: user.utorid });

    expect(resetRes.status).toBe(202);
    expect(resetRes.body).toHaveProperty('resetToken');
    const { resetToken } = resetRes.body;

    // consume reset token with new password
    const newPassword = 'NewPass123!';
    const consumeRes = await request(app)
        .post(`/auth/resets/${resetToken}`)
        .send({ utorid: user.utorid, password: newPassword });

    expect(consumeRes.status).toBe(200);
    expect(consumeRes.body).toHaveProperty('message', 'Password reset successful');

    // old password should now fail
    const oldLogin = await request(app)
        .post('/auth/tokens')
        .send({ utorid: user.utorid, password });
    expect(oldLogin.status).toBe(401);

    // new password should work
    const newLogin = await request(app)
        .post('/auth/tokens')
        .send({ utorid: user.utorid, password: newPassword });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.token).toBeTruthy();
});

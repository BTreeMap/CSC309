'use strict';

require('./setupTestEnv');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app, prisma } = require('..');
const { clearDatabase, createUserWithRole } = require('./helpers/db');

const JWT_SECRET = process.env.JWT_SECRET;

const getToken = (user) => jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '2h' });

describe('User Endpoints (Extended)', () => {
    let superuser, manager, cashier, regular;
    let superuserToken, managerToken, cashierToken, regularToken;

    beforeAll(async () => {
        await clearDatabase();

        const su = await createUserWithRole('superuser', { utorid: 'superadm' });
        superuser = su.user;
        superuserToken = getToken(superuser);

        const m = await createUserWithRole('manager', { utorid: 'usrmgr01' });
        manager = m.user;
        managerToken = getToken(manager);

        const c = await createUserWithRole('cashier', { utorid: 'usrcash1' });
        cashier = c.user;
        cashierToken = getToken(cashier);

        const r = await createUserWithRole('regular', { utorid: 'usrreg01', points: 500 });
        regular = r.user;
        regularToken = getToken(regular);
    });

    afterAll(async () => {
        await clearDatabase();
        await prisma.$disconnect();
    });

    describe('POST /users', () => {
        test('cashier can create new user', async () => {
            const res = await request(app)
                .post('/users')
                .set('Authorization', `Bearer ${cashierToken}`)
                .send({
                    utorid: 'newusr01',
                    name: 'New User',
                    email: 'newusr01@mail.utoronto.ca'
                });

            expect(res.status).toBe(201);
            expect(res.body.utorid).toBe('newusr01');
            expect(res.body.resetToken).toBeDefined();
        });

        test('rejects duplicate utorid', async () => {
            const res = await request(app)
                .post('/users')
                .set('Authorization', `Bearer ${cashierToken}`)
                .send({
                    utorid: 'newusr01',
                    name: 'Duplicate User',
                    email: 'dup@mail.utoronto.ca'
                });

            expect(res.status).toBe(409);
        });

        test('regular user cannot create users', async () => {
            const res = await request(app)
                .post('/users')
                .set('Authorization', `Bearer ${regularToken}`)
                .send({
                    utorid: 'unauth01',
                    name: 'Unauthorized',
                    email: 'unauth@mail.utoronto.ca'
                });

            expect(res.status).toBe(403);
        });

        test('validates utorid format', async () => {
            const res = await request(app)
                .post('/users')
                .set('Authorization', `Bearer ${cashierToken}`)
                .send({
                    utorid: 'ab',  // too short
                    name: 'Bad Utorid',
                    email: 'bad@mail.utoronto.ca'
                });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /users', () => {
        test('manager can list all users', async () => {
            const res = await request(app)
                .get('/users')
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('results');
            expect(res.body).toHaveProperty('count');
        });

        test('can filter by name', async () => {
            const res = await request(app)
                .get('/users?name=New')
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(200);
        });

        test('can filter by role', async () => {
            const res = await request(app)
                .get('/users?role=regular')
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(200);
            res.body.results.forEach(u => {
                expect(u.role).toBe('regular');
            });
        });

        test('can filter by verified status', async () => {
            const res = await request(app)
                .get('/users?verified=true')
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(200);
        });

        test('cashier cannot list users', async () => {
            const res = await request(app)
                .get('/users')
                .set('Authorization', `Bearer ${cashierToken}`);

            expect(res.status).toBe(403);
        });
    });

    describe('GET /users/me', () => {
        test('user can view own profile', async () => {
            const res = await request(app)
                .get('/users/me')
                .set('Authorization', `Bearer ${regularToken}`);

            expect(res.status).toBe(200);
            expect(res.body.utorid).toBe(regular.utorid);
            expect(res.body.points).toBeDefined();
        });

        test('unauthenticated request fails', async () => {
            const res = await request(app)
                .get('/users/me');

            expect(res.status).toBe(401);
        });
    });

    describe('PATCH /users/me', () => {
        test('user can update own profile', async () => {
            const res = await request(app)
                .patch('/users/me')
                .set('Authorization', `Bearer ${regularToken}`)
                .send({
                    name: 'Updated Name',
                    email: 'updated@mail.utoronto.ca'
                });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated Name');
        });

        test('user can update birthday', async () => {
            const res = await request(app)
                .patch('/users/me')
                .set('Authorization', `Bearer ${regularToken}`)
                .send({
                    birthday: '1990-01-15'
                });

            expect(res.status).toBe(200);
        });

        test('cannot update role through this endpoint', async () => {
            const res = await request(app)
                .patch('/users/me')
                .set('Authorization', `Bearer ${regularToken}`)
                .send({
                    role: 'manager'
                });

            // API rejects requests with role field
            expect(res.status).toBe(400);
        });
    });

    describe('GET /users/lookup/:identifier', () => {
        test('can lookup user by utorid', async () => {
            const res = await request(app)
                .get(`/users/lookup/${regular.utorid}`)
                .set('Authorization', `Bearer ${cashierToken}`);

            expect(res.status).toBe(200);
            expect(res.body.utorid).toBe(regular.utorid);
        });

        test('can lookup user by id', async () => {
            const res = await request(app)
                .get(`/users/lookup/${regular.id}`)
                .set('Authorization', `Bearer ${cashierToken}`);

            expect(res.status).toBe(200);
            expect(res.body.id).toBe(regular.id);
        });

        test('returns 404 for non-existent user', async () => {
            const res = await request(app)
                .get('/users/lookup/nonexistent')
                .set('Authorization', `Bearer ${cashierToken}`);

            expect(res.status).toBe(404);
        });
    });

    describe('GET /users/:userId', () => {
        test('cashier can view user details', async () => {
            const res = await request(app)
                .get(`/users/${regular.id}`)
                .set('Authorization', `Bearer ${cashierToken}`);

            expect(res.status).toBe(200);
            expect(res.body.id).toBe(regular.id);
        });

        test('manager sees more details', async () => {
            const res = await request(app)
                .get(`/users/${regular.id}`)
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(200);
            // Manager should see additional fields
        });

        test('regular user cannot view other users', async () => {
            const res = await request(app)
                .get(`/users/${manager.id}`)
                .set('Authorization', `Bearer ${regularToken}`);

            expect(res.status).toBe(403);
        });
    });

    describe('PATCH /users/:userId', () => {
        test('manager can update user', async () => {
            const res = await request(app)
                .patch(`/users/${regular.id}`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                    verified: true
                });

            expect(res.status).toBe(200);
            expect(res.body.verified).toBe(true);
        });

        test('manager can promote user to cashier', async () => {
            // Create a new user to promote
            const createRes = await request(app)
                .post('/users')
                .set('Authorization', `Bearer ${cashierToken}`)
                .send({
                    utorid: 'promote1',
                    name: 'To Promote',
                    email: 'promote@mail.utoronto.ca'
                });

            expect(createRes.status).toBe(201);

            // First verify the user
            const verifyRes = await request(app)
                .patch(`/users/${createRes.body.id}`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                    verified: true
                });

            expect(verifyRes.status).toBe(200);

            // Then promote
            const res = await request(app)
                .patch(`/users/${createRes.body.id}`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                    role: 'cashier'
                });

            expect(res.status).toBe(200);
            expect(res.body.role).toBe('cashier');
        });

        test('manager cannot promote above own role', async () => {
            const res = await request(app)
                .patch(`/users/${regular.id}`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                    role: 'superuser'
                });

            expect(res.status).toBe(403);
        });

        test('cashier cannot update users', async () => {
            const res = await request(app)
                .patch(`/users/${regular.id}`)
                .set('Authorization', `Bearer ${cashierToken}`)
                .send({
                    verified: true
                });

            expect(res.status).toBe(403);
        });
    });

    describe('PATCH /users/me/password', () => {
        test('user can change own password', async () => {
            // Create a fresh user for password change test
            const { user, password } = await createUserWithRole('regular', {
                utorid: 'pwdtest1',
                password: 'OldPass123!'
            });
            const token = getToken(user);

            const res = await request(app)
                .patch('/users/me/password')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    old: 'OldPass123!',
                    new: 'NewPass456!'
                });

            expect(res.status).toBe(200);
        });

        test('rejects wrong old password', async () => {
            const res = await request(app)
                .patch('/users/me/password')
                .set('Authorization', `Bearer ${regularToken}`)
                .send({
                    old: 'WrongPassword123!',
                    new: 'NewPass456!'
                });

            expect(res.status).toBe(403);
        });

        test('validates new password strength', async () => {
            const res = await request(app)
                .patch('/users/me/password')
                .set('Authorization', `Bearer ${regularToken}`)
                .send({
                    old: 'TestPass123!',
                    new: 'weak'
                });

            expect(res.status).toBe(400);
        });
    });
});

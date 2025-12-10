'use strict';

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { app, prisma } = require('..');
const { clearDatabase, createUserWithRole } = require('./helpers/db');

const uploadsDir = path.join(__dirname, '..', 'uploads');

beforeAll(() => {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
});

beforeEach(async () => {
    await clearDatabase();
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    for (const file of fs.readdirSync(uploadsDir)) {
        fs.unlinkSync(path.join(uploadsDir, file));
    }
});

afterAll(async () => {
    await prisma.$disconnect();
});

test('serves known image type with nosniff and cache headers', async () => {
    const filename = 'test-image.png';
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const res = await request(app).get(`/uploads/${filename}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cache-control']).toContain('immutable');
});

test('serves unknown extension as attachment octet-stream', async () => {
    const filename = 'test-file.bin';
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, Buffer.from('hello'));

    const res = await request(app).get(`/uploads/${filename}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/octet-stream');
    expect(res.headers['content-disposition']).toContain('attachment');
});

const login = async (utorid, password) => {
    const res = await request(app)
        .post('/auth/tokens')
        .send({ utorid, password });
    return res.body.token;
};

test('rejects non-image avatar upload', async () => {
    const { user, password } = await createUserWithRole('regular');
    const token = await login(user.utorid, password);

    const res = await request(app)
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .attach('avatar', Buffer.from('not-an-image'), {
            filename: 'notevil.txt',
            contentType: 'text/plain'
        });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(fs.readdirSync(uploadsDir).length).toBe(0);
});

test('accepts image avatar upload and stores file', async () => {
    const { user, password } = await createUserWithRole('regular');
    const token = await login(user.utorid, password);

    const res = await request(app)
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .attach('avatar', Buffer.from([0x89, 0x50, 0x4e, 0x47]), {
            filename: 'avatar.png',
            contentType: 'image/png'
        });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('avatarUrl');
    expect(res.body.avatarUrl).toContain('/uploads/');
    expect(fs.readdirSync(uploadsDir).length).toBe(1);
});

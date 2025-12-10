'use strict';

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { app, prisma } = require('..');

const uploadsDir = path.join(__dirname, '..', 'uploads');

beforeAll(() => {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
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

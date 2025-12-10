'use strict';

require('./setupTestEnv');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app, prisma } = require('..');
const { clearDatabase, createUserWithRole } = require('./helpers/db');

const JWT_SECRET = process.env.JWT_SECRET;

const getToken = (user) => jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '2h' });

describe('Event Endpoints', () => {
    let manager, regular, regular2;
    let managerToken, regularToken, regular2Token;
    let testEventId;

    beforeAll(async () => {
        await clearDatabase();

        const m = await createUserWithRole('manager', { utorid: 'evtmgr01' });
        manager = m.user;
        managerToken = getToken(manager);

        const r = await createUserWithRole('regular', { utorid: 'evtreg01', points: 1000 });
        regular = r.user;
        regularToken = getToken(regular);

        const r2 = await createUserWithRole('regular', { utorid: 'evtreg02', points: 500 });
        regular2 = r2.user;
        regular2Token = getToken(regular2);

        // Create a test event directly in database
        const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const endDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);

        const event = await prisma.event.create({
            data: {
                name: 'Test Event',
                description: 'A test event',
                location: 'Test Location',
                startTime: futureDate,
                endTime: endDate,
                capacity: 100,
                pointsTotal: 50,
                pointsRemain: 50,
                pointsAwarded: 0,
                published: true
            }
        });
        testEventId = event.id;
    });

    afterAll(async () => {
        await clearDatabase();
        await prisma.$disconnect();
    });

    describe('POST /events', () => {
        test('manager can create event', async () => {
            const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const endDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);

            const res = await request(app)
                .post('/events')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                    name: 'Test Event',
                    description: 'A test event',
                    location: 'Test Location',
                    startTime: futureDate.toISOString(),
                    endTime: endDate.toISOString(),
                    capacity: 100,
                    points: 50
                });

            expect(res.status).toBe(201);
            expect(res.body.name).toBe('Test Event');
            expect(res.body.capacity).toBe(100);
            testEvent = res.body;
        });

        test('regular user cannot create event', async () => {
            const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const endDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);

            const res = await request(app)
                .post('/events')
                .set('Authorization', `Bearer ${regularToken}`)
                .send({
                    name: 'Unauthorized Event',
                    description: 'Should fail',
                    location: 'Nowhere',
                    startTime: futureDate.toISOString(),
                    endTime: endDate.toISOString()
                });

            expect(res.status).toBe(403);
        });

        test('rejects event with end time before start time', async () => {
            const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const beforeDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);

            const res = await request(app)
                .post('/events')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                    name: 'Invalid Event',
                    description: 'Bad times',
                    location: 'Test',
                    startTime: futureDate.toISOString(),
                    endTime: beforeDate.toISOString()
                });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /events', () => {
        test('authenticated user can list events', async () => {
            const res = await request(app)
                .get('/events')
                .set('Authorization', `Bearer ${regularToken}`);

            if (res.status === 500) console.log('LIST ERROR:', res.body);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('results');
            expect(Array.isArray(res.body.results)).toBe(true);
        });

        test('can filter events by name', async () => {
            const res = await request(app)
                .get('/events?name=Test')
                .set('Authorization', `Bearer ${regularToken}`);

            expect(res.status).toBe(200);
        });

        test('supports pagination', async () => {
            const res = await request(app)
                .get('/events?page=1&limit=5')
                .set('Authorization', `Bearer ${regularToken}`);

            expect(res.status).toBe(200);
            expect(res.body.results.length).toBeLessThanOrEqual(5);
        });
    });

    describe('GET /events/:eventId', () => {
        test('can view event details', async () => {
            const res = await request(app)
                .get(`/events/${testEventId}`)
                .set('Authorization', `Bearer ${regularToken}`);

            expect(res.status).toBe(200);
            expect(res.body.id).toBe(testEventId);
            expect(res.body.name).toBe('Test Event');
        });

        test('returns 404 for non-existent event', async () => {
            const res = await request(app)
                .get('/events/999999')
                .set('Authorization', `Bearer ${regularToken}`);

            expect(res.status).toBe(404);
        });
    });

    describe('PATCH /events/:eventId', () => {
        test('manager can update event', async () => {
            const res = await request(app)
                .patch(`/events/${testEventId}`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                    name: 'Updated Test Event',
                    capacity: 150
                });

            if (res.status !== 200) console.log('UPDATE FAIL:', testEventId, res.status, res.body);
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated Test Event');
            expect(res.body.capacity).toBe(150);
        });

        test('regular user cannot update event', async () => {
            const res = await request(app)
                .patch(`/events/${testEventId}`)
                .set('Authorization', `Bearer ${regularToken}`)
                .send({ name: 'Hacked Event' });

            expect(res.status).toBe(403);
        });
    });

    describe('POST /events/:eventId/organizers', () => {
        test('manager can add organizer', async () => {
            const res = await request(app)
                .post(`/events/${testEventId}/organizers`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({ utorid: regular.utorid });

            expect(res.status).toBe(201);
            expect(res.body.organizers).toBeDefined();
        });

        test('cannot add same organizer twice', async () => {
            // First ensure organizer exists
            await request(app)
                .post(`/events/${testEventId}/organizers`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({ utorid: regular.utorid });

            const res = await request(app)
                .post(`/events/${testEventId}/organizers`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({ utorid: regular.utorid });

            expect(res.status).toBe(409);
        });

        test('regular user cannot add organizer', async () => {
            const res = await request(app)
                .post(`/events/${testEventId}/organizers`)
                .set('Authorization', `Bearer ${regular2Token}`)
                .send({ utorid: regular2.utorid });

            expect(res.status).toBe(403);
        });
    });

    describe('DELETE /events/:eventId/organizers/:userId', () => {
        test('manager can remove organizer', async () => {
            // First add an organizer
            await request(app)
                .post(`/events/${testEventId}/organizers`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({ utorid: regular2.utorid });

            const res = await request(app)
                .delete(`/events/${testEventId}/organizers/${regular2.id}`)
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(204);
        });
    });

    describe('POST /events/:eventId/guests/me', () => {
        test('user can RSVP to event', async () => {
            const res = await request(app)
                .post(`/events/${testEventId}/guests/me`)
                .set('Authorization', `Bearer ${regular2Token}`);

            expect(res.status).toBe(201);
        });

        test('cannot RSVP twice', async () => {
            const res = await request(app)
                .post(`/events/${testEventId}/guests/me`)
                .set('Authorization', `Bearer ${regular2Token}`);

            expect(res.status).toBe(400);
        });
    });

    describe('DELETE /events/:eventId/guests/me', () => {
        test('user can cancel RSVP', async () => {
            // First ensure user has RSVP'd
            await request(app)
                .post(`/events/${testEventId}/guests/me`)
                .set('Authorization', `Bearer ${regular2Token}`);

            const res = await request(app)
                .delete(`/events/${testEventId}/guests/me`)
                .set('Authorization', `Bearer ${regular2Token}`);

            expect(res.status).toBe(204);
        });
    });

    describe('POST /events/:eventId/guests', () => {
        test('organizer can add guest', async () => {
            // regular is an organizer
            const res = await request(app)
                .post(`/events/${testEventId}/guests`)
                .set('Authorization', `Bearer ${regularToken}`)
                .send({ utorid: regular2.utorid });

            expect(res.status).toBe(201);
        });
    });

    describe('DELETE /events/:eventId/guests/:userId', () => {
        test('manager can remove guest', async () => {
            // First ensure guest exists
            await request(app)
                .post(`/events/${testEventId}/guests`)
                .set('Authorization', `Bearer ${regularToken}`)
                .send({ utorid: regular2.utorid });

            const res = await request(app)
                .delete(`/events/${testEventId}/guests/${regular2.id}`)
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(204);
        });
    });

    describe('POST /events/:eventId/transactions', () => {
        beforeAll(async () => {
            // Add guest back for transaction test
            await request(app)
                .post(`/events/${testEventId}/guests`)
                .set('Authorization', `Bearer ${regularToken}`)
                .send({ utorid: regular2.utorid });
        });

        test('organizer can award points to guest', async () => {
            const res = await request(app)
                .post(`/events/${testEventId}/transactions`)
                .set('Authorization', `Bearer ${regularToken}`)
                .send({ type: 'event', utorid: regular2.utorid, amount: 10 });

            expect(res.status).toBe(201);
            expect(res.body.type).toBe('event');
        });

        test('can award points multiple times to same guest', async () => {
            const res = await request(app)
                .post(`/events/${testEventId}/transactions`)
                .set('Authorization', `Bearer ${regularToken}`)
                .send({ type: 'event', utorid: regular2.utorid, amount: 5 });

            // Second award should also succeed if points remain
            expect(res.status).toBe(201);
        });
    });

    describe('DELETE /events/:eventId', () => {
        test('manager can delete event', async () => {
            // Create a new event to delete
            const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
            const endDate = new Date(Date.now() + 11 * 24 * 60 * 60 * 1000);

            const createRes = await request(app)
                .post('/events')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                    name: 'Event to Delete',
                    description: 'Will be deleted',
                    location: 'Nowhere',
                    startTime: futureDate.toISOString(),
                    endTime: endDate.toISOString(),
                    points: 10
                });

            expect(createRes.status).toBe(201);

            const res = await request(app)
                .delete(`/events/${createRes.body.id}`)
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(204);
        });

        test('regular user cannot delete event', async () => {
            const res = await request(app)
                .delete(`/events/${testEventId}`)
                .set('Authorization', `Bearer ${regularToken}`);

            expect(res.status).toBe(403);
        });
    });
});

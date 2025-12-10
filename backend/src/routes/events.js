/**
 * Event Routes
 * 
 * Handles event CRUD and guest/organizer management.
 */
'use strict';

const express = require('express');

/**
 * Factory function to create the events router with dependencies
 */
function createEventsRouter(deps) {
    const { prisma, validateRequest, requireRole, hasRoleManager, hasRole, isDefined, isNullish, isPositiveInteger } = deps;
    const router = express.Router();

    // ============================================================================
    // EVENT ENDPOINTS
    // ============================================================================

    // POST /events - Create event (Manager+)
    router.post('/', requireRole('manager'), async (req, res) => {
        try {
            // Validate request
            const validation = validateRequest('POST /events', req.body);
            if (!validation.valid) {
                return res.status(400).json({ error: validation.error });
            }

            const { name, description, location, startTime, endTime, capacity, points } = req.body;

            const start = new Date(startTime);
            const end = new Date(endTime);

            if (start >= end) {
                return res.status(400).json({ error: 'Start time must be before end time' });
            }

            if (points < 0) {
                return res.status(400).json({ error: 'Invalid points' });
            }

            const event = await prisma.event.create({
                data: {
                    name,
                    description,
                    location,
                    startTime: start,
                    endTime: end,
                    capacity: capacity ?? null,
                    pointsTotal: points,
                    pointsRemain: points,
                    pointsAwarded: 0,
                    published: false
                }
            });

            res.status(201).json({
                id: event.id,
                name: event.name,
                description: event.description,
                location: event.location,
                startTime: event.startTime,
                endTime: event.endTime,
                capacity: event.capacity,
                pointsRemain: event.pointsRemain,
                pointsAwarded: event.pointsAwarded,
                published: event.published,
                organizers: [],
                guests: []
            });
        } catch (error) {
            console.error('Create event error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // GET /events - List events
    router.get('/', requireRole('regular'), async (req, res) => {
        try {
            // Validate request
            const validation = validateRequest('GET /events', req.query);
            if (!validation.valid) {
                return res.status(400).json({ error: validation.error });
            }

            const { name, location, started, ended, showFull, published, page = '1', limit = '10' } = req.query;
            const isManager = hasRoleManager(req.auth.role);

            // Validate that both started and ended are not specified
            if (isDefined(started) && isDefined(ended)) {
                return res.status(400).json({ error: 'Cannot specify both started and ended' });
            }

            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;

            const where = {};
            const now = new Date();

            if (!isManager) {
                // Regular users only see published events
                where.published = true;
            } else if (isDefined(published)) {
                where.published = published === 'true';
            }

            if (name) {
                where.name = { contains: name };
            }

            if (location) {
                where.location = { contains: location };
            }

            if (isDefined(started)) {
                if (started === 'true') {
                    where.startTime = { lte: now };
                } else {
                    where.startTime = { gt: now };
                }
            }

            if (isDefined(ended)) {
                if (ended === 'true') {
                    where.endTime = { lt: now };
                } else {
                    where.endTime = { gte: now };
                }
            }

            const [count, events] = await Promise.all([
                prisma.event.count({ where }),
                prisma.event.findMany({
                    where,
                    skip,
                    take: limitNum,
                    include: {
                        guests: true
                    }
                })
            ]);

            // Filter out full events if showFull is not true (default behavior)
            let results = events;
            let filteredCount = count;
            if (showFull !== 'true') {
                results = events.filter(event => {
                    if (isNullish(event.capacity)) return true;
                    return event.guests.length < event.capacity;
                });
                // For count, we need to count all events that match the filter, not just the current page
                if (events.some(e => isDefined(e.capacity) && e.guests.length >= e.capacity)) {
                    // Recount by fetching all matching events
                    const allEvents = await prisma.event.findMany({
                        where,
                        include: {
                            guests: true
                        }
                    });
                    filteredCount = allEvents.filter(event => {
                        if (isNullish(event.capacity)) return true;
                        return event.guests.length < event.capacity;
                    }).length;
                }
            }

            // Format results based on user role
            const formattedResults = results.map(event => {
                const numGuests = event.guests.length;

                const base = {
                    id: event.id,
                    name: event.name,
                    location: event.location,
                    startTime: event.startTime,
                    endTime: event.endTime,
                    capacity: event.capacity,
                    numGuests
                };

                if (isManager) {
                    return {
                        ...base,
                        pointsRemain: event.pointsRemain,
                        pointsAwarded: event.pointsAwarded,
                        published: event.published
                    };
                }

                return base;
            });

            res.json({ count: filteredCount, results: formattedResults });
        } catch (error) {
            console.error('List events error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // GET /events/:eventId - Get event details
    router.get('/:eventId', requireRole('regular'), async (req, res) => {
        try {
            const eventId = parseInt(req.params.eventId);

            if (isNaN(eventId)) {
                return res.status(404).json({ error: 'Event not found' });
            }

            const isManager = hasRoleManager(req.auth.role);

            const event = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    organizers: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    utorid: true,
                                    name: true
                                }
                            }
                        }
                    },
                    guests: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    utorid: true,
                                    name: true
                                }
                            }
                        }
                    }
                }
            });

            if (!event) {
                return res.status(404).json({ error: 'Event not found' });
            }

            // Check if user is organizer
            const isOrganizer = event.organizers.some(o => o.userId === req.auth.sub);

            // Regular users can only see published events unless they are organizers
            if (!isManager && !isOrganizer && !event.published) {
                return res.status(404).json({ error: 'Event not found' });
            }

            const numGuests = event.guests.length;
            const organizersList = event.organizers.map(o => o.user);

            if (isManager || isOrganizer) {
                // Full view
                return res.json({
                    id: event.id,
                    name: event.name,
                    description: event.description,
                    location: event.location,
                    startTime: event.startTime,
                    endTime: event.endTime,
                    capacity: event.capacity,
                    numGuests,
                    pointsRemain: event.pointsRemain,
                    pointsAwarded: event.pointsAwarded,
                    published: event.published,
                    organizers: organizersList,
                    guests: event.guests.map(g => ({
                        id: g.user.id,
                        utorid: g.user.utorid,
                        name: g.user.name
                    }))
                });
            }

            // Public view
            const userGuest = event.guests.find(g => g.userId === req.auth.sub);

            res.json({
                id: event.id,
                name: event.name,
                description: event.description,
                location: event.location,
                startTime: event.startTime,
                endTime: event.endTime,
                capacity: event.capacity,
                numGuests,
                organizers: organizersList,
                guests: userGuest ? [{
                    id: userGuest.user.id,
                    utorid: userGuest.user.utorid,
                    name: userGuest.user.name
                }] : []
            });
        } catch (error) {
            console.error('Get event error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // PATCH /events/:eventId - Update event (Manager or organizer)
    router.patch('/:eventId', requireRole('regular'), async (req, res) => {
        try {
            // Validate request
            const validation = validateRequest('PATCH /events/:eventId', req.body);
            if (!validation.valid) {
                return res.status(400).json({ error: validation.error });
            }

            const eventId = parseInt(req.params.eventId);

            if (isNaN(eventId)) {
                return res.status(404).json({ error: 'Event not found' });
            }

            const isManager = hasRoleManager(req.auth.role);

            const event = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    organizers: true,
                    guests: true
                }
            });

            if (!event) {
                return res.status(404).json({ error: 'Event not found' });
            }

            const isOrganizer = event.organizers.some(o => o.userId === req.auth.sub);

            if (!isManager && !isOrganizer) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            const now = new Date();
            const { name, description, location, startTime, endTime, capacity, points, published } = req.body;

            // Validate time-based restrictions
            const hasStarted = event.startTime <= now;
            const hasEnded = event.endTime <= now;

            if (hasStarted && (isDefined(name) || isDefined(description) || isDefined(location) || isDefined(startTime) || isDefined(capacity))) {
                console.warn('Attempt to update restricted fields after event start', event, req.body);
                return res.status(400).json({ error: 'Cannot update these fields after event has started' });
            }

            if (hasEnded && isDefined(endTime)) {
                console.warn('Attempt to update end time after event end', event, req.body);
                return res.status(400).json({ error: 'Cannot update end time after event has ended' });
            }

            const updates = {};
            const updatedFields = {};

            if (isDefined(name)) {
                updates.name = name;
                updatedFields.name = name;
            }
            if (isDefined(description)) {
                updates.description = description;
                updatedFields.description = description;
            }
            if (isDefined(location)) {
                updates.location = location;
                updatedFields.location = location;
            }

            if (isDefined(startTime) || isDefined(endTime)) {
                const start = startTime ? new Date(startTime) : event.startTime;
                const end = endTime ? new Date(endTime) : event.endTime;

                if (start >= end) {
                    console.warn('Invalid time update: start time must be before end time', event, req.body);
                    return res.status(400).json({ error: 'Start time must be before end time' });
                }

                // New times cannot be in the past
                if ((startTime && start < now) || (endTime && end < now)) {
                    console.warn('Attempt to set start or end time in the past', event, req.body);
                    return res.status(400).json({ error: 'Start time and end time cannot be in the past' });
                }

                if (startTime) {
                    updates.startTime = start;
                    updatedFields.startTime = start;
                }
                if (endTime) {
                    updates.endTime = end;
                    updatedFields.endTime = end;
                }
            }

            if ('capacity' in req.body && isDefined(capacity)) {
                if (!isPositiveInteger(capacity)) {
                    console.warn('Invalid capacity value', event, req.body);
                    return res.status(400).json({ error: 'Invalid capacity' });
                }
                if (event.guests.length > capacity) {
                    console.warn('Attempt to set capacity less than current number of guests', event, req.body);
                    return res.status(400).json({ error: 'Capacity cannot be less than current number of guests' });
                }
                updates.capacity = capacity;
                updatedFields.capacity = capacity;
            }

            // Only managers can set published or points
            if (!isManager) {
                if (isDefined(published) || isDefined(points)) {
                    return res.status(403).json({ error: 'Only managers can set published or points' });
                }
            } else {
                if (isDefined(published)) {
                    // Can only set to true (can't unpublish)
                    if (!published) {
                        console.warn('Attempt to unpublish event', event, req.body);
                        return res.status(400).json({ error: 'Published can only be set to true' });
                    }
                    updates.published = published;
                    updatedFields.published = published;
                }
                if (isDefined(points)) {
                    if (points < 0) {
                        console.warn('Invalid points update', event, req.body);
                        return res.status(400).json({ error: 'Invalid points' });
                    }
                    const pointsDelta = points - event.pointsTotal;
                    const newPointsRemain = event.pointsRemain + pointsDelta;
                    if (newPointsRemain < 0) {
                        console.warn('Attempt to reduce points below awarded amount', event, req.body);
                        return res.status(400).json({ error: 'Cannot reduce points below awarded amount' });
                    }
                    updates.pointsTotal = points;
                    updates.pointsRemain = newPointsRemain;
                    updatedFields.pointsRemain = newPointsRemain;
                    updatedFields.pointsAwarded = event.pointsAwarded;
                }
            }

            await prisma.event.update({
                where: { id: eventId },
                data: updates
            });

            // Return id, name, location + updated fields
            const result = {
                id: event.id,
                name: updates.name || event.name,
                location: updates.location || event.location,
                ...updatedFields
            };
            console.log('Event updated:', result);
            res.json(result);
        } catch (error) {
            console.error('Update event error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // DELETE /events/:eventId - Delete event (Manager+)
    router.delete('/:eventId', requireRole('manager'), async (req, res) => {
        try {
            const eventId = parseInt(req.params.eventId);

            if (isNaN(eventId)) {
                return res.status(404).json({ error: 'Event not found' });
            }

            const event = await prisma.event.findUnique({
                where: { id: eventId }
            });

            if (!event) {
                return res.status(404).json({ error: 'Event not found' });
            }

            if (event.published) {
                return res.status(400).json({ error: 'Cannot delete published event' });
            }

            // Delete related records first to avoid foreign key constraint violations
            await prisma.$transaction(async (tx) => {
                await tx.eventOrganizer.deleteMany({ where: { eventId } });
                await tx.eventGuest.deleteMany({ where: { eventId } });
                await tx.event.delete({ where: { id: eventId } });
            });

            res.status(204).send();
        } catch (error) {
            console.error('Delete event error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // POST /events/:eventId/organizers - Add organizer (Manager+)
    router.post('/:eventId/organizers', requireRole('manager'), async (req, res) => {
        try {
            // Validate request
            const validation = validateRequest('POST /events/:eventId/organizers', req.body);
            if (!validation.valid) {
                return res.status(400).json({ error: validation.error });
            }

            const eventId = parseInt(req.params.eventId);

            if (isNaN(eventId)) {
                return res.status(404).json({ error: 'Event not found' });
            }
            const { utorid } = req.body;

            const event = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    guests: true
                }
            });

            if (!event) {
                return res.status(404).json({ error: 'Event not found' });
            }

            const now = new Date();
            if (event.endTime <= now) {
                return res.status(410).json({ error: 'Event has ended' });
            }

            const user = await prisma.user.findUnique({
                where: { utorid }
            });

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (!user.isVerified) {
                return res.status(400).json({ error: 'User must be verified before becoming an organizer' });
            }

            // Check if user is already a guest
            if (event.guests.some(g => g.userId === user.id)) {
                return res.status(400).json({ error: 'User is already a guest' });
            }

            await prisma.eventOrganizer.create({
                data: {
                    eventId,
                    userId: user.id
                }
            });

            const updatedEvent = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    organizers: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    utorid: true,
                                    name: true
                                }
                            }
                        }
                    }
                }
            });

            res.status(201).json({
                id: updatedEvent.id,
                name: updatedEvent.name,
                location: updatedEvent.location,
                organizers: updatedEvent.organizers.map(o => o.user)
            });
        } catch (error) {
            if (error.code === 'P2002') {
                return res.status(409).json({ error: 'User is already an organizer' });
            }
            console.error('Add organizer error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // DELETE /events/:eventId/organizers/:userId - Remove organizer (Manager+)
    router.delete('/:eventId/organizers/:userId', requireRole('manager'), async (req, res) => {
        try {
            const eventId = parseInt(req.params.eventId);
            const userId = parseInt(req.params.userId);

            if (isNaN(eventId)) {
                return res.status(404).json({ error: 'Event not found' });
            }

            if (isNaN(userId)) {
                return res.status(404).json({ error: 'User not found' });
            }

            const organizer = await prisma.eventOrganizer.findFirst({
                where: {
                    eventId,
                    userId
                }
            });

            if (!organizer) {
                return res.status(404).json({ error: 'Organizer not found' });
            }

            const organizerCount = await prisma.eventOrganizer.count({
                where: { eventId }
            });

            if (organizerCount <= 1) {
                return res.status(400).json({ error: 'Event must have at least one organizer' });
            }

            await prisma.eventOrganizer.delete({
                where: { id: organizer.id }
            });

            res.status(204).send();
        } catch (error) {
            console.error('Remove organizer error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // POST /events/:eventId/guests/me - RSVP self (Regular+)
    router.post('/:eventId/guests/me', requireRole('regular'), async (req, res) => {
        try {
            const eventId = parseInt(req.params.eventId);

            if (isNaN(eventId)) {
                return res.status(404).json({ error: 'Event not found' });
            }

            const event = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    guests: true,
                    organizers: true
                }
            });

            if (!event) {
                return res.status(404).json({ error: 'Event not found' });
            }

            if (!event.published) {
                return res.status(404).json({ error: 'Event not found' });
            }

            const now = new Date();
            if (event.endTime <= now) {
                return res.status(410).json({ error: 'Event has ended' });
            }

            if (isDefined(event.capacity) && event.guests.length >= event.capacity) {
                return res.status(410).json({ error: 'Event is full' });
            }

            // Check if user is an organizer
            if (event.organizers.some(o => o.userId === req.auth.sub)) {
                return res.status(400).json({ error: 'User is an organizer' });
            }

            // Check if already RSVP'd
            if (event.guests.some(g => g.userId === req.auth.sub)) {
                return res.status(400).json({ error: 'Already RSVP\'d' });
            }

            const currentUser = await prisma.user.findUnique({
                where: { id: req.auth.sub },
                select: { id: true, utorid: true, name: true, isVerified: true }
            });

            if (!currentUser.isVerified) {
                return res.status(400).json({ error: 'User must be verified before RSVPing to events' });
            }

            await prisma.eventGuest.create({
                data: {
                    eventId,
                    userId: req.auth.sub,
                    confirmed: false
                }
            });

            res.status(201).json({
                id: event.id,
                name: event.name,
                location: event.location,
                guestAdded: currentUser,
                numGuests: event.guests.length + 1
            });
        } catch (error) {
            console.error('RSVP error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // DELETE /events/:eventId/guests/me - Remove self RSVP (Regular+)
    router.delete('/:eventId/guests/me', requireRole('regular'), async (req, res) => {
        try {
            const eventId = parseInt(req.params.eventId);

            if (isNaN(eventId)) {
                return res.status(404).json({ error: 'Event not found' });
            }

            const event = await prisma.event.findUnique({
                where: { id: eventId }
            });

            if (!event) {
                return res.status(404).json({ error: 'Event not found' });
            }

            const guest = await prisma.eventGuest.findFirst({
                where: {
                    eventId,
                    userId: req.auth.sub
                }
            });

            if (!guest) {
                return res.status(404).json({ error: 'Not RSVP\'d to this event' });
            }

            const now = new Date();
            if (event.endTime <= now) {
                return res.status(410).json({ error: 'Event has ended' });
            }

            await prisma.eventGuest.delete({
                where: { id: guest.id }
            });

            res.status(204).send();
        } catch (error) {
            console.error('Remove RSVP error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // POST /events/:eventId/guests - Add guest (Manager or organizer)
    router.post('/:eventId/guests', requireRole('regular'), async (req, res) => {
        try {
            // Validate request
            const validation = validateRequest('POST /events/:eventId/guests', req.body);
            if (!validation.valid) {
                return res.status(400).json({ error: validation.error });
            }

            const eventId = parseInt(req.params.eventId);

            if (isNaN(eventId)) {
                return res.status(404).json({ error: 'Event not found' });
            }
            const { utorid } = req.body;
            const isManager = hasRoleManager(req.auth.role);

            const event = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    organizers: true,
                    guests: true
                }
            });

            if (!event) {
                return res.status(404).json({ error: 'Event not found' });
            }

            const isOrganizer = event.organizers.some(o => o.userId === req.auth.sub);

            if (!isManager && !isOrganizer) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            // Organizers can see unpublished events they're organizing
            // But a non-manager, non-organizer would have already been rejected above

            const now = new Date();
            if (event.endTime <= now) {
                return res.status(410).json({ error: 'Event has ended' });
            }

            const user = await prisma.user.findUnique({
                where: { utorid }
            });

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (!user.isVerified) {
                return res.status(400).json({ error: 'User must be verified before being added to events' });
            }

            // Check if user is already a guest
            const isAlreadyGuest = event.guests.some(g => g.userId === user.id);

            // Check capacity (excluding user if already a guest)
            const effectiveGuestCount = isAlreadyGuest ? event.guests.length : event.guests.length + 1;
            if (isDefined(event.capacity) && effectiveGuestCount > event.capacity) {
                return res.status(410).json({ error: 'Event is full' });
            }

            // Check if user is an organizer
            if (event.organizers.some(o => o.userId === user.id)) {
                return res.status(400).json({ error: 'User is an organizer' });
            }

            // If user is already a guest, don't create duplicate
            if (isAlreadyGuest) {
                return res.status(409).json({ error: 'User is already a guest' });
            }

            await prisma.eventGuest.create({
                data: {
                    eventId,
                    userId: user.id,
                    confirmed: false
                }
            });

            const numGuests = event.guests.length + 1;

            res.status(201).json({
                id: event.id,
                name: event.name,
                location: event.location,
                guestAdded: {
                    id: user.id,
                    utorid: user.utorid,
                    name: user.name
                },
                numGuests
            });
        } catch (error) {
            if (error.code === 'P2002') {
                return res.status(409).json({ error: 'User is already a guest' });
            }
            console.error('Add guest error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // DELETE /events/:eventId/guests/:userId - Remove guest (Manager+)
    router.delete('/:eventId/guests/:userId', requireRole('manager'), async (req, res) => {
        try {
            const eventId = parseInt(req.params.eventId);
            const userId = parseInt(req.params.userId);

            if (isNaN(eventId)) {
                return res.status(404).json({ error: 'Event not found' });
            }

            if (isNaN(userId)) {
                return res.status(404).json({ error: 'User not found' });
            }

            const guest = await prisma.eventGuest.findFirst({
                where: {
                    eventId,
                    userId
                }
            });

            if (!guest) {
                return res.status(404).json({ error: 'Guest not found' });
            }

            await prisma.eventGuest.delete({
                where: { id: guest.id }
            });

            res.status(204).send();
        } catch (error) {
            console.error('Remove guest error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // POST /events/:eventId/transactions - Award event points (Manager or organizer)
    router.post('/:eventId/transactions', requireRole('regular'), async (req, res) => {
        try {
            // Validate request
            const validation = validateRequest('POST /events/:eventId/transactions', req.body);
            if (!validation.valid) {
                return res.status(400).json({ error: validation.error });
            }

            const eventId = parseInt(req.params.eventId);

            if (isNaN(eventId)) {
                return res.status(404).json({ error: 'Event not found' });
            }
            const { type, utorid, amount, remark } = req.body;
            const isManager = hasRoleManager(req.auth.role);

            // Validate required fields
            if (type !== 'event') {
                return res.status(400).json({ error: 'Type must be "event"' });
            }

            const event = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    organizers: true,
                    guests: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    utorid: true,
                                    name: true
                                }
                            }
                        }
                    }
                }
            });

            if (!event) {
                return res.status(404).json({ error: 'Event not found' });
            }

            const isOrganizer = event.organizers.some(o => o.userId === req.auth.sub);

            if (!isManager && !isOrganizer) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            const creator = await prisma.user.findUnique({
                where: { id: req.auth.sub },
                select: { utorid: true }
            });

            if (utorid) {
                // Award to specific guest
                const guest = event.guests.find(g => g.user.utorid === utorid);

                if (!guest) {
                    return res.status(400).json({ error: 'User is not a guest of this event' });
                }

                if (event.pointsRemain < amount) {
                    return res.status(400).json({ error: 'Insufficient points remaining' });
                }

                const transaction = await prisma.$transaction(async (tx) => {
                    const txn = await tx.transaction.create({
                        data: {
                            userId: guest.user.id,
                            type: 'event',
                            amount: amount,
                            relatedId: eventId,
                            remark: remark || event.name,
                            createdById: req.auth.sub
                        }
                    });

                    await tx.user.update({
                        where: { id: guest.user.id },
                        data: { points: { increment: amount } }
                    });

                    await tx.event.update({
                        where: { id: eventId },
                        data: {
                            pointsRemain: { decrement: amount },
                            pointsAwarded: { increment: amount }
                        }
                    });

                    await tx.eventGuest.updateMany({
                        where: {
                            eventId,
                            userId: guest.user.id
                        },
                        data: { confirmed: true }
                    });

                    return txn;
                });

                res.status(201).json({
                    id: transaction.id,
                    recipient: guest.user.utorid,
                    awarded: amount,
                    type: 'event',
                    relatedId: eventId,
                    remark: transaction.remark,
                    createdBy: creator.utorid
                });

            } else {
                // Award to all guests
                if (event.guests.length === 0) {
                    return res.status(400).json({ error: 'No guests to award' });
                }

                const totalPoints = amount * event.guests.length;
                if (event.pointsRemain < totalPoints) {
                    return res.status(400).json({ error: 'Insufficient points remaining' });
                }

                const transactions = await prisma.$transaction(async (tx) => {
                    const txns = [];

                    for (const guest of event.guests) {
                        const txn = await tx.transaction.create({
                            data: {
                                userId: guest.user.id,
                                type: 'event',
                                amount: amount,
                                relatedId: eventId,
                                remark: remark || event.name,
                                createdById: req.auth.sub
                            }
                        });

                        await tx.user.update({
                            where: { id: guest.user.id },
                            data: { points: { increment: amount } }
                        });

                        txns.push({
                            id: txn.id,
                            recipient: guest.user.utorid,
                            awarded: amount,
                            type: 'event',
                            relatedId: eventId,
                            remark: txn.remark,
                            createdBy: creator.utorid
                        });
                    }

                    await tx.event.update({
                        where: { id: eventId },
                        data: {
                            pointsRemain: { decrement: totalPoints },
                            pointsAwarded: { increment: totalPoints }
                        }
                    });

                    await tx.eventGuest.updateMany({
                        where: { eventId },
                        data: { confirmed: true }
                    });

                    return txns;
                });

                res.status(201).json(transactions);
            }
        } catch (error) {
            console.error('Award event points error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    return router;
}

module.exports = createEventsRouter;

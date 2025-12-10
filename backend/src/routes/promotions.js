/**
 * Promotion Routes
 * 
 * Handles creation, listing, updating, and deletion of promotions.
 */
'use strict';

const express = require('express');
const router = express.Router();

const prisma = require('../db/prisma');
const { requireRole, hasRoleManager } = require('../auth/jwt');
const { validateRequest, isDefined } = require('../validation');

/**
 * POST /promotions - Create promotion (Manager+)
 */
router.post('/', requireRole('manager'), async (req, res) => {
  try {
    const validation = validateRequest('POST /promotions', req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const { name, description, type, startTime, endTime, minSpending, rate, points } = req.body;

    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (start < now) {
      return res.status(400).json({ error: 'Start time cannot be in the past' });
    }

    if (start >= end) {
      return res.status(400).json({ error: 'Start time must be before end time' });
    }

    // Convert "one-time" to "onetime" for database
    const dbType = type === 'one-time' ? 'onetime' : type;

    const promotion = await prisma.promotion.create({
      data: {
        name,
        description,
        type: dbType,
        startTime: start,
        endTime: end,
        minSpending: minSpending ?? null,
        rate: rate ?? null,
        points: points ?? null
      }
    });

    // Convert "onetime" back to "one-time" for API response
    const response = {
      ...promotion,
      type: promotion.type === 'onetime' ? 'one-time' : promotion.type
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Create promotion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /promotions - List promotions
 */
router.get('/', requireRole('regular'), async (req, res) => {
  try {
    const validation = validateRequest('GET /promotions', req.query);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const { name, type, started, ended, page = '1', limit = '10' } = req.query;
    const isManager = hasRoleManager(req.auth.role);

    // Validate that both started and ended are not specified
    if (isDefined(started) && isDefined(ended)) {
      return res.status(400).json({ error: 'Cannot specify both started and ended' });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = Math.max(0, (pageNum - 1) * limitNum);

    const where = {};
    const now = new Date();

    if (name) {
      where.name = { contains: name };
    }

    if (type) {
      where.type = type === 'one-time' ? 'onetime' : type;
    }

    if (!isManager) {
      // Regular users only see active promotions they haven't used
      where.startTime = { lte: now };
      where.endTime = { gte: now };

      // Filter out one-time promotions already used by this user
      where.NOT = {
        AND: [
          { type: 'onetime' },
          {
            usedBy: {
              some: {
                userId: req.auth.sub
              }
            }
          }
        ]
      };
    } else {
      if (isDefined(started)) {
        where.startTime = started === 'true' ? { lte: now } : { gt: now };
      }

      if (isDefined(ended)) {
        where.endTime = ended === 'true' ? { lt: now } : { gte: now };
      }
    }

    const [count, results] = await Promise.all([
      prisma.promotion.count({ where }),
      prisma.promotion.findMany({
        where,
        skip,
        take: limitNum
      })
    ]);

    const formattedResults = results.map(promotion => {
      const base = {
        id: promotion.id,
        name: promotion.name,
        type: promotion.type === 'onetime' ? 'one-time' : promotion.type,
        endTime: promotion.endTime,
        minSpending: promotion.minSpending,
        rate: promotion.rate,
        points: promotion.points
      };

      if (isManager) {
        return { ...base, startTime: promotion.startTime };
      }

      return base;
    });

    res.json({ count, results: formattedResults });
  } catch (error) {
    console.error('List promotions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /promotions/:promotionId - Get promotion details
 */
router.get('/:promotionId', requireRole('regular'), async (req, res) => {
  try {
    const promotionId = parseInt(req.params.promotionId);

    if (isNaN(promotionId)) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    const isManager = hasRoleManager(req.auth.role);

    const promotion = await prisma.promotion.findUnique({
      where: { id: promotionId }
    });

    if (!promotion) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    const now = new Date();
    const isActive = promotion.startTime <= now && promotion.endTime >= now;

    if (!isManager && !isActive) {
      return res.status(404).json({ error: 'Promotion not active' });
    }

    const response = {
      id: promotion.id,
      name: promotion.name,
      description: promotion.description,
      type: promotion.type === 'onetime' ? 'one-time' : promotion.type,
      endTime: promotion.endTime,
      minSpending: promotion.minSpending,
      rate: promotion.rate,
      points: promotion.points
    };

    if (isManager) {
      response.startTime = promotion.startTime;
    }

    res.json(response);
  } catch (error) {
    console.error('Get promotion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /promotions/:promotionId - Update promotion (Manager+)
 */
router.patch('/:promotionId', requireRole('manager'), async (req, res) => {
  try {
    const validation = validateRequest('PATCH /promotions/:promotionId', req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const promotionId = parseInt(req.params.promotionId);

    if (isNaN(promotionId)) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    const { name, description, type, startTime, endTime, minSpending, rate, points } = req.body;

    const promotion = await prisma.promotion.findUnique({
      where: { id: promotionId }
    });

    if (!promotion) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    const now = new Date();
    const hasStarted = promotion.startTime <= now;
    const hasEnded = promotion.endTime <= now;

    // Validate time-based restrictions
    if (hasStarted && (isDefined(name) || isDefined(description) || isDefined(type) ||
        isDefined(startTime) || isDefined(minSpending) || isDefined(rate) || isDefined(points))) {
      return res.status(400).json({ error: 'Cannot update these fields after promotion has started' });
    }

    if (hasEnded && isDefined(endTime)) {
      return res.status(400).json({ error: 'Cannot update end time after promotion has ended' });
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
    if (isDefined(type)) {
      const dbType = type === 'one-time' ? 'onetime' : type;
      updates.type = dbType;
      updatedFields.type = type;
    }

    if (isDefined(startTime) || isDefined(endTime)) {
      const start = isDefined(startTime) ? new Date(startTime) : promotion.startTime;
      const end = isDefined(endTime) ? new Date(endTime) : promotion.endTime;

      if ((startTime && isNaN(start.getTime())) || (endTime && isNaN(end.getTime()))) {
        return res.status(400).json({ error: 'Invalid date format' });
      }

      if (start < now || end < now) {
        return res.status(400).json({ error: 'Start time and end time cannot be in the past' });
      }

      if (start >= end) {
        return res.status(400).json({ error: 'Start time must be before end time' });
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

    if (isDefined(minSpending)) {
      if (minSpending < 0) {
        return res.status(400).json({ error: 'Invalid minSpending' });
      }
      updates.minSpending = minSpending;
      updatedFields.minSpending = minSpending;
    }

    if (isDefined(rate)) {
      if (rate < 0) {
        return res.status(400).json({ error: 'Invalid rate' });
      }
      updates.rate = rate;
      updatedFields.rate = rate;
    }

    if (isDefined(points)) {
      if (points < 0) {
        return res.status(400).json({ error: 'Invalid points' });
      }
      updates.points = points;
      updatedFields.points = points;
    }

    const updated = await prisma.promotion.update({
      where: { id: promotionId },
      data: updates
    });

    const responseType = updated.type === 'onetime' ? 'one-time' : updated.type;
    res.json({
      id: updated.id,
      name: updates.name || promotion.name,
      type: updatedFields.type || responseType,
      ...updatedFields
    });
  } catch (error) {
    console.error('Update promotion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /promotions/:promotionId - Delete promotion (Manager+)
 */
router.delete('/:promotionId', requireRole('manager'), async (req, res) => {
  try {
    const promotionId = parseInt(req.params.promotionId);

    if (isNaN(promotionId)) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    const promotion = await prisma.promotion.findUnique({
      where: { id: promotionId }
    });

    if (!promotion) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    const now = new Date();
    if (promotion.startTime <= now) {
      return res.status(403).json({ error: 'Cannot delete promotion that has started' });
    }

    const [usageCount, transactionCount] = await Promise.all([
      prisma.userPromotionUse.count({ where: { promotionId } }),
      prisma.transactionPromotion.count({ where: { promotionId } })
    ]);

    if (usageCount > 0 || transactionCount > 0) {
      return res.status(403).json({ error: 'Cannot delete promotion that has been used' });
    }

    await prisma.promotion.delete({
      where: { id: promotionId }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete promotion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

/**
 * Transaction Routes
 * 
 * Handles transaction CRUD operations (purchases, adjustments, redemptions).
 */
'use strict';

const express = require('express');

/**
 * Factory function to create the transactions router with dependencies
 */
function createTransactionsRouter(deps) {
  const { prisma, validateRequest, requireRole, isDefined, isPositiveNumber, calculatePoints } = deps;
  const router = express.Router();

// ============================================================================
// TRANSACTION ENDPOINTS
// ============================================================================

// POST /transactions - Create purchase or adjustment (Cashier+ / Manager+)
router.post('/', requireRole('cashier'), async (req, res) => {
    try {
        // Validate request
        const validation = validateRequest('POST /transactions', req.body);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        const { utorid, type, spent: rawSpent, amount, relatedId, promotionIds: rawPromotionIds, remark } = req.body;

        // Normalize promotionIds to always be an array of numbers
        const promotionIds = (Array.isArray(rawPromotionIds) ? rawPromotionIds : [])
            .map(id => {
                const numId = typeof id === 'string' ? parseInt(id, 10) : id;
                if (isNaN(numId)) {
                    throw new Error('Invalid promotion ID format');
                }
                return numId;
            });

        const user = await prisma.user.findUnique({ where: { utorid } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const creator = await prisma.user.findUnique({ where: { id: req.auth.sub } });
        if (!creator) {
            return res.status(404).json({ error: 'Creator not found' });
        }

        if (type === 'purchase') {
            // Ensure spent is a number
            const spent = typeof rawSpent === 'number' ? rawSpent : parseFloat(rawSpent);
            if (!isPositiveNumber(spent) || !isFinite(spent)) {
                return res.status(400).json({ error: 'Spent amount must be a positive number' });
            }

            // Get all active automatic promotions
            const now = new Date();
            const automaticPromotions = await prisma.promotion.findMany({
                where: {
                    type: 'automatic',
                    startTime: { lte: now },
                    endTime: { gte: now },
                    OR: [
                        { minSpending: null },
                        { minSpending: { lte: spent } }
                    ]
                }
            });

            // Validate and fetch manual promotions
            const manualPromotions = promotionIds.length > 0
                ? await prisma.promotion.findMany({
                    where: {
                        id: { in: promotionIds }
                    }
                })
                : [];

            if (promotionIds.length > 0) {
                if (manualPromotions.length !== promotionIds.length) {
                    return res.status(400).json({ error: 'Invalid promotion IDs' });
                }

                // Check if promotions are active
                for (const promo of manualPromotions) {
                    if (promo.startTime > now || promo.endTime < now) {
                        return res.status(400).json({ error: 'Promotion not active' });
                    }
                    if (promo.minSpending && spent < promo.minSpending) {
                        return res.status(400).json({ error: 'Minimum spending not met for promotion' });
                    }
                }

                // Check if one-time promotions have already been used
                for (const promo of manualPromotions) {
                    if (promo.type === 'onetime') {
                        const existingUse = await prisma.userPromotionUse.findUnique({
                            where: {
                                userId_promotionId: {
                                    userId: user.id,
                                    promotionId: promo.id
                                }
                            }
                        });
                        if (existingUse) {
                            return res.status(400).json({ error: 'One-time promotion already used' });
                        }
                    }
                }
            }

            // Combine all promotions and remove duplicates
            const promotionMap = new Map();
            [...automaticPromotions, ...manualPromotions].forEach(promo => {
                promotionMap.set(promo.id, promo);
            });
            const allPromotions = Array.from(promotionMap.values());
            const allPromotionIds = Array.from(new Set(allPromotions.map(p => p.id)));

            const earned = calculatePoints(spent, allPromotions);

            if (!Number.isInteger(earned) || earned < 0 || !isFinite(earned)) {
                return res.status(400).json({ error: 'Invalid points calculation' });
            }

            const isSuspicious = creator.suspicious;

            // Use database transaction to ensure atomicity
            const uniquePromotionIds = Array.from(new Set(allPromotionIds));
            if (uniquePromotionIds.length !== allPromotionIds.length) {
                console.warn('Duplicate promotion IDs detected and removed:', {
                    original: allPromotionIds,
                    unique: uniquePromotionIds
                });
            }

            const transaction = await prisma.$transaction(async (tx) => {
                // Mark one-time promotions as used
                const oneTimePromotions = manualPromotions.filter(p => p.type === 'onetime');
                for (const promo of oneTimePromotions) {
                    try {
                        await tx.userPromotionUse.create({
                            data: {
                                userId: user.id,
                                promotionId: promo.id
                            }
                        });
                    } catch (error) {
                        if (error.code === 'P2002') {
                            throw new Error('One-time promotion already used');
                        }
                        throw error;
                    }
                }

                // Create transaction
                const transactionData = {
                    userId: user.id,
                    type: 'purchase',
                    amount: earned,
                    spent: spent,
                    suspicious: isSuspicious,
                    remark: remark || null,
                    createdById: req.auth.sub,
                };

                if (uniquePromotionIds.length > 0) {
                    transactionData.promotions = {
                        create: uniquePromotionIds.map(id => ({
                            promotionId: id
                        }))
                    };
                }

                const createdTransaction = await tx.transaction.create({
                    data: transactionData,
                    include: {
                        promotions: {
                            include: {
                                promotion: true
                            }
                        }
                    }
                });

                // Add points if not suspicious
                if (!isSuspicious) {
                    await tx.user.update({
                        where: { id: user.id },
                        data: { points: { increment: earned } }
                    });
                }

                return createdTransaction;
            });

            res.status(201).json({
                id: transaction.id,
                utorid: user.utorid,
                type: transaction.type,
                spent: transaction.spent,
                points: isSuspicious ? 0 : transaction.amount,
                earned: isSuspicious ? 0 : transaction.amount,
                remark: transaction.remark ?? '',
                promotionIds: uniquePromotionIds,
                createdBy: creator.utorid
            });

        } else if (type === 'adjustment') {
            // Only managers can create adjustments
            if (req.auth.role !== 'manager' && req.auth.role !== 'superuser') {
                return res.status(403).json({ error: 'Only managers can create adjustments' });
            }

            if (!isDefined(amount)) {
                return res.status(400).json({ error: 'Missing amount' });
            }

            // Validate relatedId if provided
            if (relatedId) {
                const relatedTransaction = await prisma.transaction.findUnique({
                    where: { id: relatedId }
                });
                if (!relatedTransaction) {
                    return res.status(404).json({ error: 'Related transaction not found' });
                }
            }

            // Check if adjustment would result in negative points
            const currentPoints = user.points ?? 0;
            const newPoints = currentPoints + amount;
            if (newPoints < 0) {
                return res.status(400).json({
                    error: `Adjustment would result in negative points. Current points: ${currentPoints}, Adjustment: ${amount}, Result: ${newPoints}`
                });
            }

            const transaction = await prisma.transaction.create({
                data: {
                    userId: user.id,
                    type: 'adjustment',
                    amount,
                    relatedId,
                    remark,
                    createdById: req.auth.sub,
                    promotions: {
                        create: promotionIds.map(id => ({
                            promotionId: id
                        }))
                    }
                }
            });

            // Adjustments apply immediately
            await prisma.user.update({
                where: { id: user.id },
                data: { points: { increment: amount } }
            });

            res.status(201).json({
                id: transaction.id,
                utorid: user.utorid,
                amount: transaction.amount,
                type: transaction.type,
                relatedId: transaction.relatedId ?? null,
                remark: transaction.remark ?? '',
                promotionIds,
                createdBy: creator.utorid
            });

        } else {
            return res.status(400).json({ error: 'Invalid transaction type for this endpoint' });
        }
    } catch (error) {
        console.error('Create transaction error:', error);
        console.error('Error stack:', error.stack);
        console.error('Request body:', req.body);

        // Handle specific error messages
        if (error.message === 'One-time promotion already used') {
            return res.status(400).json({ error: error.message });
        }

        // Handle Prisma errors
        if (error.code === 'P2002') {
            // Check if it's a TransactionPromotion unique constraint error
            if (error.meta && error.meta.target && error.meta.target.includes('transactionId') && error.meta.target.includes('promotionId')) {
                return res.status(400).json({ error: 'Duplicate promotion detected. Please ensure each promotion is only selected once.' });
            }
            return res.status(400).json({ error: 'Duplicate entry detected' });
        }

        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// GET /transactions - List transactions (Manager+)
router.get('/', requireRole('manager'), async (req, res) => {
    try {
        // Validate request
        const validation = validateRequest('GET /transactions', req.query);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        const {
            name,
            createdBy,
            suspicious,
            type,
            relatedId,
            amount,
            operator,
            promotionId,
            page = '1',
            limit = '10'
        } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        const skip = (pageNum - 1) * limitNum;

        const where = {};

        if (name) {
            where.user = {
                OR: [
                    { utorid: { contains: name } },
                    { name: { contains: name } }
                ]
            };
        }

        if (createdBy) {
            where.createdBy = {
                utorid: createdBy
            };
        }

        if (isDefined(suspicious)) {
            where.suspicious = suspicious === 'true';
        }

        if (type) {
            where.type = type;
        }

        if (relatedId) {
            where.relatedId = parseInt(relatedId);
        }

        if (amount && operator) {
            const amountNum = parseInt(amount);
            if (operator === 'gte') {
                where.amount = { gte: amountNum };
            } else if (operator === 'lte') {
                where.amount = { lte: amountNum };
            }
        }

        if (promotionId) {
            where.promotions = {
                some: {
                    promotionId: parseInt(promotionId)
                }
            };
        }

        const [count, results] = await Promise.all([
            prisma.transaction.count({ where }),
            prisma.transaction.findMany({
                where,
                skip,
                take: limitNum,
                include: {
                    user: {
                        select: {
                            id: true,
                            utorid: true,
                            name: true
                        }
                    },
                    createdBy: {
                        select: {
                            id: true,
                            utorid: true,
                            name: true
                        }
                    },
                    promotions: {
                        include: {
                            promotion: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        // Format results to include promotionIds array
        const formattedResults = results.map(tx => {
            const base = {
                id: tx.id,
                utorid: tx.user.utorid,
                amount: tx.amount,
                type: tx.type,
                promotionIds: tx.promotions.map(p => p.promotionId),
                suspicious: tx.suspicious,
                remark: tx.remark ?? '',
                createdBy: tx.createdBy.utorid,
                createdAt: tx.createdAt,
                processedAt: tx.processedAt
            };

            // Add type-specific fields
            if (tx.type === 'purchase') {
                base.spent = tx.spent;
            } else if (tx.type === 'adjustment' || tx.type === 'transfer' || tx.type === 'event') {
                base.relatedId = tx.relatedId;
            } else if (tx.type === 'redemption') {
                base.redeemed = tx.redeemed;
            }

            return base;
        });

        res.json({ count, results: formattedResults });
    } catch (error) {
        console.error('List transactions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /transactions/:transactionId - Get transaction details (Cashier+)
router.get('/:transactionId', requireRole('cashier'), async (req, res) => {
    try {
        const transactionId = parseInt(req.params.transactionId);

        if (isNaN(transactionId)) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                user: {
                    select: {
                        id: true,
                        utorid: true,
                        name: true
                    }
                },
                createdBy: {
                    select: {
                        id: true,
                        utorid: true,
                        name: true
                    }
                },
                processedBy: {
                    select: {
                        id: true,
                        utorid: true,
                        name: true
                    }
                },
                promotions: {
                    include: {
                        promotion: true
                    }
                }
            }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Format response based on transaction type
        const response = {
            id: transaction.id,
            utorid: transaction.user.utorid,
            type: transaction.type,
            amount: transaction.amount,
            promotionIds: transaction.promotions.map(p => p.promotionId),
            suspicious: transaction.suspicious,
            remark: transaction.remark ?? '',
            createdBy: transaction.createdBy.utorid,
            createdAt: transaction.createdAt,
            processedAt: transaction.processedAt
        };

        // Add type-specific fields
        if (transaction.type === 'purchase') {
            response.spent = transaction.spent;
        } else if (transaction.type === 'adjustment' || transaction.type === 'transfer' || transaction.type === 'event') {
            response.relatedId = transaction.relatedId;
        } else if (transaction.type === 'redemption') {
            response.redeemed = transaction.redeemed;
            response.processedBy = transaction.processedBy ? transaction.processedBy.utorid : null;
        }

        res.json(response);
    } catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /transactions/:transactionId/suspicious - Toggle suspicious (Manager+)
router.patch('/:transactionId/suspicious', requireRole('manager'), async (req, res) => {
    try {
        // Validate request
        const validation = validateRequest('PATCH /transactions/:transactionId/suspicious', req.body);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        const transactionId = parseInt(req.params.transactionId);

        if (isNaN(transactionId)) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        const { suspicious } = req.body;

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                user: true,
                createdBy: true,
                promotions: true
            }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Update transaction
        const updated = await prisma.transaction.update({
            where: { id: transactionId },
            data: { suspicious }
        });

        // Adjust user points based on change
        if (transaction.suspicious !== suspicious) {
            const pointsDelta = suspicious ? -transaction.amount : transaction.amount;
            await prisma.user.update({
                where: { id: transaction.userId },
                data: { points: { increment: pointsDelta } }
            });
        }

        // Format response
        const response = {
            id: updated.id,
            utorid: transaction.user.utorid,
            type: transaction.type,
            amount: transaction.amount,
            promotionIds: transaction.promotions.map(p => p.promotionId),
            suspicious: updated.suspicious,
            remark: transaction.remark ?? '',
            createdBy: transaction.createdBy.utorid
        };

        // Add type-specific fields
        if (transaction.type === 'purchase') {
            response.spent = transaction.spent;
        } else if (transaction.type === 'adjustment' || transaction.type === 'transfer' || transaction.type === 'event') {
            response.relatedId = transaction.relatedId;
        }

        res.json(response);
    } catch (error) {
        console.error('Toggle suspicious error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /users/me/transactions - Create redemption (Regular+)

  return router;
}

module.exports = createTransactionsRouter;

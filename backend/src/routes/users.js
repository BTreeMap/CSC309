/**
 * User Routes
 * 
 * Handles user CRUD and profile operations.
 */
'use strict';

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const multer = require('multer');

/**
 * Factory function to create the users router with dependencies
 */
function createUsersRouter(deps) {
  const { 
    prisma, 
    validateRequest, 
    requireRole, 
    hasRoleManager, 
    isDefined, 
    RoleOrderMap, 
    upload,
    resolveRelativeUrl,
    DEFAULT_AVATAR_URL,
    isNonEmptyString,
    isValidDate
  } = deps;
  const router = express.Router();

// ============================================================================
// USER MANAGEMENT ENDPOINTS
// ============================================================================

// POST /users - Create user (Cashier+)
router.post('/', requireRole('cashier'), async (req, res) => {
    try {
        // Validate request
        const validation = validateRequest('POST /users', req.body);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        const { utorid, name, email, birthday } = req.body;

        const resetToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 3600000); // 7 days

        const tempPassword = crypto.randomBytes(16).toString('hex');
        const passwordHash = await bcrypt.hash(tempPassword, 12);

        const user = await prisma.user.create({
            data: {
                utorid,
                name,
                email,
                birthday: birthday ? new Date(birthday) : null,
                passwordBcrypt: passwordHash,
                role: 'regular',
                points: 0,
                isVerified: false,
                suspicious: false,
                resetTokens: {
                    create: {
                        token: resetToken,
                        expiry: expiresAt
                    }
                }
            }
        });

        res.status(201).json({
            id: user.id,
            utorid: user.utorid,
            name: user.name,
            email: user.email,
            verified: false,
            expiresAt: expiresAt.toISOString(),
            resetToken
        });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'User already exists' });
        }
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /users - List users (Manager+)
router.get('/', requireRole('manager'), async (req, res) => {
    try {
        // Validate request
        const validation = validateRequest('GET /users', req.query);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        const { name, role, verified, activated, page = '1', limit = '10' } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        if (isNaN(pageNum) || pageNum < 1 || isNaN(limitNum) || limitNum < 1) {
            return res.status(400).json({ error: 'Invalid pagination parameters' });
        }

        const skip = (pageNum - 1) * limitNum;

        const where = {};
        if (name) {
            where.OR = [
                { utorid: { contains: name } },
                { name: { contains: name } }
            ];
        }
        if (role) {
            where.role = role;
        }
        if (isDefined(verified)) {
            where.isVerified = verified === 'true';
        }
        if (isDefined(activated)) {
            if (activated === 'true') {
                where.lastLogin = { not: null };
            } else {
                where.lastLogin = null;
            }
        }

        const [count, results] = await Promise.all([
            prisma.user.count({ where }),
            prisma.user.findMany({
                where,
                skip,
                take: limitNum,
                select: {
                    id: true,
                    utorid: true,
                    name: true,
                    email: true,
                    birthday: true,
                    role: true,
                    points: true,
                    isVerified: true,
                    createdAt: true,
                    lastLogin: true,
                    avatarUrl: true
                }
            })
        ]);

        // Map isVerified to verified
        const formattedResults = results.map(user => ({
            id: user.id,
            utorid: user.utorid,
            name: user.name,
            email: user.email,
            birthday: user.birthday,
            role: user.role,
            points: user.points,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            verified: user.isVerified,
            avatarUrl: user.avatarUrl ? resolveRelativeUrl(user.avatarUrl) : DEFAULT_AVATAR_URL,
        }));

        res.json({ count, results: formattedResults });
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /users/me - Get own profile (Regular+)
router.get('/me', requireRole('regular'), async (req, res) => {
    try {
        if (!req.auth || !req.auth.sub) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.auth.sub }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get available promotions (one-time only that haven't been used)
        const now = new Date();
        const availablePromotions = await prisma.promotion.findMany({
            where: {
                type: 'onetime',
                startTime: { lte: now },
                endTime: { gte: now },
                NOT: {
                    usedBy: {
                        some: {
                            userId: user.id
                        }
                    }
                }
            },
            select: {
                id: true,
                name: true,
                minSpending: true,
                rate: true,
                points: true
            }
        });

        res.json({
            id: user.id,
            utorid: user.utorid,
            name: user.name,
            email: user.email,
            birthday: user.birthday ? user.birthday.toLocaleDateString('en-CA') : null,
            role: user.role,
            points: user.points,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            verified: user.isVerified,
            avatarUrl: user.avatarUrl ? resolveRelativeUrl(user.avatarUrl) : DEFAULT_AVATAR_URL,
            promotions: availablePromotions
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /users/me - Update own profile (Regular+)
router.patch('/me', requireRole('regular'), (req, res, next) => {
    upload.single('avatar')(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: 'File too large. Maximum size is 5MB' });
                }
                return res.status(400).json({ error: `Upload error: ${err.message}` });
            }
            // Custom error from fileFilter
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        // Validate request (note: avatar handled separately by multer)
        const validation = validateRequest('PATCH /users/me', { ...req.body, avatar: req.file });
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        const { name, email, birthday } = req.body;
        const updates = {};

        // Check if at least one field is being updated
        if (!name && !email && !birthday && !req.file) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        if (isNonEmptyString(name)) {
            updates.name = name;
        }

        if (isNonEmptyString(email)) {
            updates.email = email;
        }

        if (isNonEmptyString(birthday)) {
            // Validate date format first
            if (!isValidDate(birthday)) {
                return res.status(400).json({ error: 'Invalid birthday format' });
            }

            // Parse the date components
            const parts = birthday.split('-');
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);

            // Create date object and verify it matches the input
            // (this catches invalid dates like 1990-02-31)
            const dateObj = new Date(year, month - 1, day, 12, 0, 0); // noon to avoid timezone issues
            if (dateObj.getFullYear() !== year ||
                dateObj.getMonth() !== month - 1 ||
                dateObj.getDate() !== day) {
                return res.status(400).json({ error: 'Invalid birthday date' });
            }

            updates.birthday = dateObj;
        }

        if (req.file) {
            updates.avatarUrl = `/uploads/${req.file.filename}`;
        }

        // Double check we have updates
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        const user = await prisma.user.update({
            where: { id: req.auth.sub },
            data: updates
        });

        // Return full profile
        res.json({
            id: user.id,
            utorid: user.utorid,
            name: user.name,
            email: user.email,
            birthday: user.birthday ? user.birthday.toLocaleDateString('en-CA') : null,
            role: user.role,
            points: user.points,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            verified: user.isVerified,
            avatarUrl: user.avatarUrl ? resolveRelativeUrl(user.avatarUrl) : DEFAULT_AVATAR_URL,
        });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Email already in use' });
        }
        console.error('Update me error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /users/lookup/:identifier - Look up user by UTORid or ID (Regular+)
router.get('/lookup/:identifier', requireRole('regular'), async (req, res) => {
    try {
        const identifier = req.params.identifier.trim();

        if (!identifier) {
            return res.status(400).json({ error: 'Invalid identifier' });
        }

        // Try to parse as integer ID first
        const userId = parseInt(identifier);
        const isNumeric = !isNaN(userId);

        let user;
        if (isNumeric) {
            // Look up by ID
            user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    utorid: true,
                    name: true,
                    email: true,
                    role: true,
                    points: true,
                    isVerified: true,
                    avatarUrl: true
                }
            });
        } else {
            // Look up by UTORid
            user = await prisma.user.findUnique({
                where: { utorid: identifier },
                select: {
                    id: true,
                    utorid: true,
                    name: true,
                    email: true,
                    role: true,
                    points: true,
                    isVerified: true,
                    avatarUrl: true
                }
            });
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user.id,
            utorid: user.utorid,
            name: user.name,
            email: user.email,
            role: user.role,
            points: user.points,
            verified: user.isVerified,
            avatarUrl: user.avatarUrl ? resolveRelativeUrl(user.avatarUrl) : DEFAULT_AVATAR_URL
        });
    } catch (error) {
        console.error('Lookup user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /users/:userId - Get user details
router.get('/:userId', requireRole('cashier'), async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);

        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const isCashier = req.auth.role === 'cashier';
        const isManager = hasRoleManager(req.auth.role);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                usedPromotions: {
                    include: {
                        promotion: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get available one-time promotions
        const now = new Date();
        const availablePromotions = await prisma.promotion.findMany({
            where: {
                type: 'onetime',
                startTime: { lte: now },
                endTime: { gte: now },
                NOT: {
                    usedBy: {
                        some: {
                            userId: user.id
                        }
                    }
                }
            },
            select: {
                id: true,
                name: true,
                minSpending: true,
                rate: true,
                points: true
            }
        });

        if (isCashier && !isManager) {
            // Limited view for cashiers
            return res.json({
                id: user.id,
                utorid: user.utorid,
                name: user.name,
                points: user.points,
                verified: user.isVerified,
                promotions: availablePromotions
            });
        }

        // Full view for managers
        res.json({
            id: user.id,
            utorid: user.utorid,
            name: user.name,
            email: user.email,
            birthday: user.birthday,
            role: user.role,
            points: user.points,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            verified: user.isVerified,
            avatarUrl: user.avatarUrl ? resolveRelativeUrl(user.avatarUrl) : DEFAULT_AVATAR_URL,
            promotions: availablePromotions
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /users/:userId - Update user (Manager+)
router.patch('/:userId', requireRole('manager'), async (req, res) => {
    try {
        // Validate request
        const validation = validateRequest('PATCH /users/:userId', req.body);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        const userId = parseInt(req.params.userId);

        if (isNaN(userId)) {
            return res.status(404).json({ error: 'User not found' });
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, suspicious: true, isVerified: true }
        });

        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (req.auth.role === 'manager') {
            const targetRoleIndex = RoleOrderMap.get(targetUser.role);
            const managerRoleIndex = RoleOrderMap.get('manager');

            if (targetRoleIndex >= managerRoleIndex) {
                return res.status(403).json({ error: 'Managers cannot edit users with manager or superuser roles' });
            }
        }

        if (req.auth.role === 'superuser' && req.auth.sub === userId && isDefined(req.body.role)) {
            return res.status(403).json({ error: 'Superusers cannot modify their own role' });
        }

        if (req.auth.role === 'superuser' && targetUser.role === 'superuser' && req.auth.sub !== userId && isDefined(req.body.role)) {
            return res.status(403).json({ error: 'Superusers cannot modify other superusers\' roles' });
        }

        const { email, verified, suspicious, role } = req.body;

        // Check if at least one field is being updated
        if (!isDefined(email) && !isDefined(verified) && !isDefined(suspicious) && !isDefined(role)) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const updates = {};

        if (isDefined(email)) {
            updates.email = email;
        }

        if (isDefined(verified)) {
            if (verified !== true) {
                // verified can only be set to true
                return res.status(400).json({ error: 'Verified can only be set to true' });
            }
            updates.isVerified = verified;
        }

        if (isDefined(suspicious)) {
            updates.suspicious = suspicious;
        }

        if (isDefined(role)) {
            // Validate role is one of the allowed values
            const validRoles = ['regular', 'cashier', 'manager', 'superuser'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({ error: 'Invalid role' });
            }

            // Only superuser can promote to superuser
            if (role === 'superuser' && req.auth.role !== 'superuser') {
                return res.status(403).json({ error: 'Only superuser can promote to superuser' });
            }

            // Manager can only set to regular or cashier
            if (req.auth.role === 'manager' && role !== 'regular' && role !== 'cashier') {
                return res.status(403).json({ error: 'Managers can only set role to regular or cashier' });
            }

            const currentRoleIndex = RoleOrderMap.get(targetUser.role);
            const newRoleIndex = RoleOrderMap.get(role);

            if (newRoleIndex > currentRoleIndex) {
                const willBeVerified = isDefined(verified) ? verified : targetUser.isVerified;
                if (!willBeVerified) {
                    return res.status(400).json({ error: 'User must be verified before role promotion' });
                }
            }

            // Check if promoting to cashier - must verify user is not suspicious
            if (role === 'cashier') {
                // Check the final suspicious state (either current or being updated)
                const willBeSuspicious = isDefined(suspicious) ? suspicious : targetUser.suspicious;

                if (willBeSuspicious) {
                    return res.status(400).json({ error: 'Suspicious users cannot be promoted to cashier' });
                }

                // Always set suspicious=false when promoting to cashier
                updates.suspicious = false;
            }

            updates.role = role;
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: updates
        });

        // Return id, utorid, name, plus updated fields
        const response = {
            id: user.id,
            utorid: user.utorid,
            name: user.name
        };
        if (isDefined(email)) response.email = user.email;
        if (isDefined(verified)) response.verified = user.isVerified;
        if (isDefined(suspicious)) response.suspicious = user.suspicious;
        if (isDefined(role)) response.role = user.role;

        res.json(response);
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'User not found' });
        }
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Email already in use' });
        }
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /users/me/password - Change own password (Regular+)
router.patch('/me/password', requireRole('regular'), async (req, res) => {
    try {
        // Validate request
        const validation = validateRequest('PATCH /users/me/password', req.body);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        const { old, new: newPassword } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: req.auth.sub }
        });

        const validPassword = await bcrypt.compare(old, user.passwordBcrypt);
        if (!validPassword) {
            return res.status(403).json({ error: 'Invalid old password' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);

        await prisma.user.update({
            where: { id: req.auth.sub },
            data: { passwordBcrypt: passwordHash }
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Update password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

  return router;
}

module.exports = createUsersRouter;

#!/usr/bin/env node
'use strict';

require('dotenv').config();

// Skip port validation when running tests
const isTestEnv = process.env.NODE_ENV === 'test';

const getPort = () => {
    if (isTestEnv) return 0; // Use any available port for tests

    const args = process.argv;

    if (args.length !== 3) {
        console.error("usage: node index.js port");
        process.exit(1);
    }

    const num = parseInt(args[2], 10);
    if (isNaN(num)) {
        console.error("error: argument must be an integer.");
        process.exit(1);
    }

    return num;
};

const port = getPort();

const express = require("express");
const app = express();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { expressjwt: expressJwt } = require('express-jwt');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// JWT Secret from environment
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('JWT_SECRET must be set in environment');
    process.exit(1);
}

// Backend URL for absolute URLs (e.g., avatar images)
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// Default avatar for users who haven't uploaded one
const DEFAULT_AVATAR_URL = 'https://ragnarok.joefang.org/static/x3prqghikuetgr1ge0q2oijgm7s35nf41.svg';

// Resolve relative URL to absolute
const resolveRelativeUrl = (relativePath) => new URL(relativePath, BACKEND_URL).toString();

// Health check endpoint (before other middleware for fast response)
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// CORS configuration for React frontend
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());

// Multer configuration for avatar uploads
// Allowed image MIME types for avatar uploads
const ALLOWED_AVATAR_MIMES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp'
];

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const userId = req.auth && req.auth.sub ? req.auth.sub : 'anonymous';
        const uniqueName = `${userId}-${crypto.randomBytes(16).toString('hex')}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// File filter to only allow safe image types
const avatarFileFilter = (_req, file, cb) => {
    if (ALLOWED_AVATAR_MIMES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (JPEG, PNG, GIF, WebP, BMP) are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter: avatarFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    }
});

// Security: Safe MIME types for uploaded files
// Only these extensions will be served; others are rejected
const SAFE_MIME_TYPES = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon'
};

// Serve uploaded files with security headers and caching
// Files have unique hash names so they're immutable - cache aggressively
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    // Set headers after express.static determines the file exists
    setHeaders: (res, filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        const safeMimeType = SAFE_MIME_TYPES[ext];

        if (safeMimeType) {
            // Override Content-Type to our safe value
            res.set('Content-Type', safeMimeType);
        } else {
            // Unknown extension - force download to prevent execution
            res.set('Content-Type', 'application/octet-stream');
            res.set('Content-Disposition', 'attachment');
        }

        // Security: Prevent MIME type sniffing
        res.set('X-Content-Type-Options', 'nosniff');

        // Caching: Files have unique hashes, so they're immutable
        // Cache for 1 year with immutable directive (Cloudflare respects this)
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
}));

// JWT middleware with error handling
app.use((req, res, next) => {
    expressJwt({
        secret: JWT_SECRET,
        algorithms: ['HS256'],
        credentialsRequired: false
    })(req, res, (err) => {
        if (err && err.name === 'UnauthorizedError') {
            // If JWT is malformed or invalid, just continue without authentication
            req.auth = null;
        }
        next();
    });
});

// Role hierarchy
const RoleOrder = ['regular', 'cashier', 'manager', 'superuser'];
const RoleOrderMap = RoleOrder.reduce((acc, role, index) => {
    acc.set(role, index);
    return acc;
}, new Map());

// Helper: validate role
const isValidRole = (role) => RoleOrderMap.has(role);

// Helper: check minimum role
const hasRole = (minRole) => {
    const minRoleIndex = RoleOrderMap.get(minRole);
    if (minRoleIndex === undefined) {
        throw new Error(`Invalid role: ${minRole}`);
    }
    return (userRole) => {
        if (typeof userRole !== 'string') {
            return false;
        }
        const userRoleIndex = RoleOrderMap.get(userRole);
        if (userRoleIndex === undefined) {
            return false;
        }
        return userRoleIndex >= minRoleIndex;
    }
}
const hasRoleManager = hasRole('manager');

// Helper: require minimum role
const requireRole = (minRole) => {
    const minRoleIndex = RoleOrderMap.get(minRole);
    if (minRoleIndex === undefined) {
        throw new Error(`Invalid role: ${minRole}`);
    }
    return (req, res, next) => {
        if (!req.auth || !req.auth.sub) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userRoleIndex = RoleOrderMap.get(req.auth.role);
        if (userRoleIndex === undefined) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (userRoleIndex < minRoleIndex) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
}

// Helper: validate UTORid
const isValidUtorid = (utorid) => typeof utorid === 'string' && /^[a-zA-Z0-9]{7,8}$/.test(utorid);

// Helper: validate name
const isValidName = (name) => typeof name === 'string' && name.length >= 1 && name.length <= 50;

// Helper: validate email is UofT
const isValidUofTEmail = (email) => typeof email === 'string' && (email.endsWith('@mail.utoronto.ca') || email.endsWith('@utoronto.ca'));

// Helper: password complexity check
const isValidPassword = (password) =>
    typeof password === 'string' &&
    password.length >= 8 &&
    password.length <= 20 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

// Helper: validate date format (YYYY-MM-DD)
const isValidDate = (date) => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);

// Helper: validate boolean string (for query parameters)
const isBooleanString = (value) => value === 'true' || value === 'false';

// Helper: validate ISO 8601 timestamp
const isValidISOTimestamp = (timestamp) => {
    if (typeof timestamp !== 'string') return false;
    try {
        const date = new Date(timestamp);
        if (date.toISOString() !== timestamp) {
            // possible minor formatting issue; log warning and accept
            console.warn(`Warning: Timestamp "${timestamp}" is not in canonical ISO format "${date.toISOString()}"`);
        }
        return !isNaN(date.getTime());
    } catch {
        return false;
    }
};

// Helper: validate positive number
const isPositiveNumber = (value) => typeof value === 'number' && value > 0;

// Helper: validate positive integer
const isPositiveInteger = (value) => typeof value === 'number' && Number.isInteger(value) && value > 0;

// Helper: validate non-negative integer (>= 0)
const isNonNegativeInteger = (value) => typeof value === 'number' && Number.isInteger(value) && value >= 0;

// Helper: validate positive integer string (for query parameters)
const isPositiveIntegerString = (value) => {
    if (typeof value !== 'string') return false;
    const num = parseInt(value, 10);
    return !isNaN(num) && num > 0 && num.toString() === value;
};

// Helper: validate number string (for query parameters)
const isNumberString = (value) => {
    if (typeof value !== 'string') return false;
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
};

// Helper: validate transaction type
const VALID_TRANSACTION_TYPES = ['purchase', 'adjustment', 'redemption', 'transfer', 'event'];
const isValidTransactionType = (type) => typeof type === 'string' && VALID_TRANSACTION_TYPES.includes(type);

// Helper: validate operator
const VALID_OPERATORS = ['gte', 'lte'];
const isValidOperator = (operator) => typeof operator === 'string' && VALID_OPERATORS.includes(operator);

// Helper: validate array of numbers
const isArrayOfNumbers = (arr) => {
    if (!Array.isArray(arr)) return false;
    return arr.every((item) => {
        if (typeof item === 'number') return true;
        if (typeof item === 'string') {
            const num = parseInt(item, 10);
            return !isNaN(num) && num.toString() === item;
        }
        return false;
    });
};

// Helper: calculate points from spending
const calculatePoints = (spent, promotions = []) => {
    if (!isFinite(spent) || spent <= 0) {
        return 0;
    }
    // Use Math.floor to match frontend calculation: Math.floor(spent * 4)
    const basePoints = Math.floor(spent * 4);
    const bonusPoints = promotions.reduce((acc, promo) => {
        let bonus = 0;
        if (promo.rate && isFinite(promo.rate)) {
            bonus += Math.floor(basePoints * promo.rate);
        }
        if (promo.points && isFinite(promo.points)) {
            bonus += Math.floor(promo.points);
        }
        return acc + bonus;
    }, 0);

    const total = basePoints + bonusPoints;
    return Math.max(0, Math.floor(total));
};

// Helper: validate promotion type
const VALID_PROMOTION_TYPES = ['automatic', 'one-time'];
const isValidPromotionType = (type) => typeof type === 'string' && VALID_PROMOTION_TYPES.includes(type);

// Helper: validate field type against validator
const validateField = (validator, value) => {
    if (typeof validator === 'string') {
        return typeof value === validator;
    }
    if (typeof validator === 'function') {
        return validator(value);
    }
    throw new Error('Invalid validator type');
};

// Helper: check if value is a non-empty string
const isNonEmptyString = (value) => typeof value === 'string' && value !== '';

// Helper: check if value is nullish (null or undefined)
const isNullish = (value) => value === null || value === undefined;

// Helper: check if value is defined and not null
const isDefined = (value) => !isNullish(value);

// Helper: validate nullable value with a validator function
const isNullableOr = (validator) => (value) => isNullish(value) || validator(value);

// Endpoint-specific field validators
const EndpointValidators = {
    // Authentication endpoints
    'POST /auth/tokens': {
        utorid: { validator: isValidUtorid, required: true },
        password: { validator: 'string', required: true }
    },
    'POST /auth/resets': {
        utorid: { validator: isValidUtorid, required: true }
    },
    'POST /auth/resets/:resetToken': {
        utorid: { validator: isValidUtorid, required: true },
        password: { validator: isValidPassword, required: true }
    },

    // User endpoints
    'POST /users': {
        utorid: { validator: isValidUtorid, required: true },
        name: { validator: isValidName, required: true },
        email: { validator: isValidUofTEmail, required: true },
        birthday: { validator: isValidDate, required: false }
    },
    'GET /users': {
        name: { validator: 'string', required: false },
        role: { validator: isValidRole, required: false },
        verified: { validator: isBooleanString, required: false },
        activated: { validator: isBooleanString, required: false },
        page: { validator: isPositiveIntegerString, required: false },
        limit: { validator: isPositiveIntegerString, required: false }
    },
    'PATCH /users/:userId': {
        email: { validator: isValidUofTEmail, required: false },
        verified: { validator: 'boolean', required: false },
        suspicious: { validator: 'boolean', required: false },
        role: { validator: isValidRole, required: false }
    },
    'PATCH /users/me': {
        name: { validator: isValidName, required: false },
        email: { validator: isValidUofTEmail, required: false },
        birthday: { validator: isValidDate, required: false },
        avatar: { validator: 'object', required: false }
    },
    'PATCH /users/me/password': {
        old: { validator: 'string', required: true },
        new: { validator: isValidPassword, required: true }
    },

    // Transaction endpoints
    'POST /transactions': {
        utorid: { validator: isValidUtorid, required: true },
        type: { validator: isValidTransactionType, required: true },
        spent: { validator: isPositiveNumber, required: false },
        amount: { validator: 'number', required: false },
        relatedId: { validator: 'number', required: false },
        promotionIds: { validator: isArrayOfNumbers, required: false },
        remark: { validator: 'string', required: false }
    },
    'GET /transactions': {
        name: { validator: 'string', required: false },
        createdBy: { validator: 'string', required: false },
        suspicious: { validator: isBooleanString, required: false },
        promotionId: { validator: isNumberString, required: false },
        type: { validator: isValidTransactionType, required: false },
        relatedId: { validator: isNumberString, required: false },
        amount: { validator: isNumberString, required: false },
        operator: { validator: isValidOperator, required: false },
        page: { validator: isPositiveIntegerString, required: false },
        limit: { validator: isPositiveIntegerString, required: false }
    },
    'PATCH /transactions/:transactionId/suspicious': {
        suspicious: { validator: 'boolean', required: true }
    },
    'POST /users/:userId/transactions': {
        type: { validator: isValidTransactionType, required: true },
        amount: { validator: isPositiveInteger, required: true },
        remark: { validator: 'string', required: false }
    },
    'POST /users/me/transactions': {
        type: { validator: isValidTransactionType, required: true },
        amount: { validator: isPositiveInteger, required: true },
        remark: { validator: 'string', required: false }
    },
    'GET /users/me/transactions': {
        type: { validator: isValidTransactionType, required: false },
        relatedId: { validator: isNumberString, required: false },
        promotionId: { validator: isNumberString, required: false },
        amount: { validator: isNumberString, required: false },
        operator: { validator: isValidOperator, required: false },
        page: { validator: isPositiveIntegerString, required: false },
        limit: { validator: isPositiveIntegerString, required: false }
    },
    'PATCH /transactions/:transactionId/processed': {
        processed: { validator: 'boolean', required: true }
    },

    // Event endpoints
    'POST /events': {
        name: { validator: 'string', required: true },
        description: { validator: 'string', required: true },
        location: { validator: 'string', required: true },
        startTime: { validator: isValidISOTimestamp, required: true },
        endTime: { validator: isValidISOTimestamp, required: true },
        capacity: { validator: isNullableOr(isPositiveInteger), required: false },
        points: { validator: isPositiveInteger, required: true }
    },
    'GET /events': {
        name: { validator: 'string', required: false },
        location: { validator: 'string', required: false },
        started: { validator: isBooleanString, required: false },
        ended: { validator: isBooleanString, required: false },
        showFull: { validator: isBooleanString, required: false },
        published: { validator: isBooleanString, required: false },
        page: { validator: isPositiveIntegerString, required: false },
        limit: { validator: isPositiveIntegerString, required: false }
    },
    'PATCH /events/:eventId': {
        name: { validator: 'string', required: false },
        description: { validator: 'string', required: false },
        location: { validator: 'string', required: false },
        startTime: { validator: isValidISOTimestamp, required: false },
        endTime: { validator: isValidISOTimestamp, required: false },
        capacity: { validator: isNullableOr(isPositiveInteger), required: false },
        points: { validator: isNonNegativeInteger, required: false },
        published: { validator: 'boolean', required: false }
    },
    'POST /events/:eventId/organizers': {
        utorid: { validator: isValidUtorid, required: true }
    },
    'POST /events/:eventId/guests': {
        utorid: { validator: isValidUtorid, required: true }
    },
    'POST /events/:eventId/transactions': {
        type: { validator: isValidTransactionType, required: true },
        utorid: { validator: isValidUtorid, required: false },
        amount: { validator: isPositiveInteger, required: true },
        remark: { validator: 'string', required: false }
    },

    // Promotion endpoints
    'POST /promotions': {
        name: { validator: 'string', required: true },
        description: { validator: 'string', required: true },
        type: { validator: isValidPromotionType, required: true },
        startTime: { validator: isValidISOTimestamp, required: true },
        endTime: { validator: isValidISOTimestamp, required: true },
        minSpending: { validator: isNullableOr(isPositiveNumber), required: false },
        rate: { validator: isPositiveNumber, required: false },
        points: { validator: isNonNegativeInteger, required: false }
    },
    'GET /promotions': {
        name: { validator: 'string', required: false },
        type: { validator: isValidPromotionType, required: false },
        started: { validator: isBooleanString, required: false },
        ended: { validator: isBooleanString, required: false },
        page: { validator: isPositiveIntegerString, required: false },
        limit: { validator: isPositiveIntegerString, required: false }
    },
    'PATCH /promotions/:promotionId': {
        name: { validator: 'string', required: false },
        description: { validator: 'string', required: false },
        type: { validator: isValidPromotionType, required: false },
        startTime: { validator: isValidISOTimestamp, required: false },
        endTime: { validator: isValidISOTimestamp, required: false },
        minSpending: { validator: isNullableOr(isPositiveNumber), required: false },
        rate: { validator: isPositiveNumber, required: false },
        points: { validator: isNonNegativeInteger, required: false }
    }
};

// Helper: validate request body/query against endpoint schema
const validateRequest = (endpointKey, requestBody) => {
    console.log(`Validating request for endpoint: ${endpointKey} with body:`, requestBody);

    const schema = EndpointValidators[endpointKey];
    if (!schema) {
        console.warn(`No validation schema defined for endpoint: ${endpointKey}`);
        return { valid: true }; // No validation schema defined
    }

    // Check for extra fields not in schema
    const allowedFields = Object.keys(schema);
    const providedFields = Object.keys(requestBody);
    const extraFields = providedFields.filter(field => !allowedFields.includes(field));

    if (extraFields.length > 0) {
        console.warn(`Extra fields in request for endpoint ${endpointKey}: ${extraFields.join(', ')}`);
        return { valid: false, error: `Invalid fields in request: ${extraFields.join(', ')}` };
    }

    // Validate each field
    for (const [fieldName, fieldConfig] of Object.entries(schema)) {
        const value = requestBody[fieldName];

        // Check if required field is missing
        if (value === undefined || value === null) {
            if (fieldConfig.required) {
                console.warn(`Missing required field in request for endpoint ${endpointKey}: ${fieldName}`);
                return { valid: false, error: `Missing required field: ${fieldName}` };
            }
            // Field is optional and not provided or null
            console.log(`Optional field not provided in request for endpoint ${endpointKey}: ${fieldName}`);
        }
        else {
            // Validate field value
            if (!validateField(fieldConfig.validator, value)) {
                console.warn(`Invalid value for field in request for endpoint ${endpointKey}: ${fieldName} = ${value}`);
                return { valid: false, error: `Invalid value for field: ${fieldName}` };
            }
        }
    }

    return { valid: true };
}

// Logging middleware
app.use((req, _, next) => {
    console.log(`Incoming request: ${req.method} ${req.path}\n - Body:`, req.body, '\n - Query:', req.query);
    next();
});

// ============================================================================
// ROUTE MODULES
// ============================================================================

// Auth routes (login, password reset)
const createAuthRouter = require('./src/routes/auth');
app.use('/auth', createAuthRouter({ prisma, validateRequest, JWT_SECRET }));


// Users routes
const createUsersRouter = require('./src/routes/users');
app.use('/users', createUsersRouter({
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
}));



// Transactions routes
const createTransactionsRouter = require('./src/routes/transactions');
app.use('/transactions', createTransactionsRouter({ prisma, validateRequest, requireRole, isDefined, isPositiveNumber, calculatePoints }));

// User transaction endpoints (redemptions, transfers)

app.post('/users/me/transactions', requireRole('regular'), async (req, res) => {
    try {
        // Validate request
        const validation = validateRequest('POST /users/me/transactions', req.body);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        const { type, amount, remark } = req.body;

        if (type !== 'redemption') {
            return res.status(400).json({ error: 'Invalid transaction type' });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.auth.sub }
        });

        if (!user.isVerified) {
            return res.status(403).json({ error: 'User not verified' });
        }

        if (user.points < amount) {
            return res.status(400).json({ error: 'Insufficient points' });
        }

        const transaction = await prisma.transaction.create({
            data: {
                userId: req.auth.sub,
                type: 'redemption',
                amount: 0, // Not deducted yet
                redeemed: amount,
                remark,
                createdById: req.auth.sub
            }
        });

        res.status(201).json({
            id: transaction.id,
            utorid: user.utorid,
            type: transaction.type,
            processedBy: null,
            amount: transaction.redeemed,
            remark: transaction.remark ?? '',
            createdBy: user.utorid
        });
    } catch (error) {
        console.error('Redemption request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /users/me/transactions - List own transactions (Regular+)
app.get('/users/me/transactions', requireRole('regular'), async (req, res) => {
    try {
        // Validate request
        const validation = validateRequest('GET /users/me/transactions', req.query);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        const { type, relatedId, promotionId, amount, operator, page = '1', limit = '10' } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        const skip = (pageNum - 1) * limitNum;

        const where = { userId: req.auth.sub };
        if (type) {
            where.type = type;
        }
        if (relatedId) {
            where.relatedId = parseInt(relatedId);
        }
        if (promotionId) {
            where.promotions = {
                some: {
                    promotionId: parseInt(promotionId)
                }
            };
        }
        if (amount && operator) {
            const amountNum = parseInt(amount);
            if (operator === 'gte') {
                where.amount = { gte: amountNum };
            } else if (operator === 'lte') {
                where.amount = { lte: amountNum };
            }
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
                            utorid: true
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

        // Get related user utorids for transactions with relatedId
        const relatedUserIdsSet = new Set(
            results
                .filter(tx => tx.relatedId !== null && (tx.type === 'transfer' || tx.type === 'adjustment' || tx.type === 'event'))
                .map(tx => tx.relatedId)
        );

        const relatedUserIds = Array.from(relatedUserIdsSet);

        const relatedUsers = relatedUserIds.length > 0
            ? await prisma.user.findMany({
                where: { id: { in: relatedUserIds } },
                select: { id: true, utorid: true }
            })
            : [];

        const relatedUsersMap = new Map(relatedUsers.map(u => [u.id, u.utorid]));

        // Format results - for own transactions, we don't include createdBy and suspicious
        const formattedResults = results.map(tx => {
            const base = {
                id: tx.id,
                type: tx.type,
                amount: tx.amount,
                promotionIds: tx.promotions.map(p => p.promotionId),
                remark: tx.remark ?? '',
                createdBy: tx.user.utorid,
                createdAt: tx.createdAt,
                processedAt: tx.processedAt
            };

            // Add type-specific fields
            if (tx.type === 'purchase') {
                base.spent = tx.spent;
            } else if (tx.type === 'adjustment' || tx.type === 'transfer' || tx.type === 'event') {
                base.relatedId = tx.relatedId;
                if (tx.relatedId && relatedUsersMap.has(tx.relatedId)) {
                    base.relatedUserUtorid = relatedUsersMap.get(tx.relatedId);
                }
            } else if (tx.type === 'redemption') {
                // For redemptions, show the redeemed amount
                base.redeemed = tx.redeemed;
            }

            return base;
        });

        res.json({ count, results: formattedResults });
    } catch (error) {
        console.error('List own transactions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /users/:userId/transactions - Create transfer (Regular+)
app.post('/users/:userId/transactions', requireRole('regular'), async (req, res) => {
    try {
        // Validate request
        const validation = validateRequest('POST /users/:userId/transactions', req.body);
        if (!validation.valid) {
            console.error('Validation failed:', validation.error);
            console.error('Request body:', req.body);
            return res.status(400).json({ error: validation.error });
        }

        const toUserId = parseInt(req.params.userId);

        if (isNaN(toUserId)) {
            return res.status(404).json({ error: 'Recipient not found' });
        }

        const { type, amount, remark } = req.body;

        if (type !== 'transfer') {
            return res.status(400).json({ error: 'Invalid transaction type' });
        }

        const fromUser = await prisma.user.findUnique({
            where: { id: req.auth.sub }
        });

        if (!fromUser.isVerified) {
            return res.status(403).json({ error: 'User not verified' });
        }

        if (fromUser.points < amount) {
            return res.status(400).json({ error: 'Insufficient points' });
        }

        const toUser = await prisma.user.findUnique({
            where: { id: toUserId }
        });

        if (!toUser) {
            return res.status(404).json({ error: 'Recipient not found' });
        }

        if (!toUser.isVerified) {
            return res.status(400).json({ error: 'Recipient not verified' });
        }

        // Create paired transactions
        const [senderTx, receiverTx] = await prisma.$transaction(async (tx) => {
            const sender = await tx.transaction.create({
                data: {
                    userId: fromUser.id,
                    type: 'transfer',
                    amount: -amount,
                    relatedId: toUser.id,  // ID of recipient user
                    remark,
                    createdById: req.auth.sub
                }
            });

            const receiver = await tx.transaction.create({
                data: {
                    userId: toUser.id,
                    type: 'transfer',
                    amount: amount,
                    relatedId: fromUser.id,  // ID of sender user
                    remark,
                    createdById: req.auth.sub
                }
            });

            // Update points
            await tx.user.update({
                where: { id: fromUser.id },
                data: { points: { decrement: amount } }
            });

            await tx.user.update({
                where: { id: toUser.id },
                data: { points: { increment: amount } }
            });

            return [sender, receiver];
        });

        res.status(201).json({
            id: senderTx.id,
            sender: fromUser.utorid,
            recipient: toUser.utorid,
            type: senderTx.type,
            sent: amount,
            remark: senderTx.remark ?? '',
            createdBy: fromUser.utorid
        });
    } catch (error) {
        console.error('Transfer error:', error);
        console.error('Error stack:', error.stack);
        console.error('Request body:', req.body);
        console.error('Request params:', req.params);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// PATCH /transactions/:transactionId/processed - Process redemption (Cashier+)
app.patch('/transactions/:transactionId/processed', requireRole('cashier'), async (req, res) => {
    try {
        // Validate request
        const validation = validateRequest('PATCH /transactions/:transactionId/processed', req.body);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        const transactionId = parseInt(req.params.transactionId);

        if (isNaN(transactionId)) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        const { processed } = req.body;

        if (!processed) {
            return res.status(400).json({ error: 'Can only set processed to true' });
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                user: true,
                createdBy: true
            }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (transaction.type !== 'redemption') {
            return res.status(400).json({ error: 'Transaction is not a redemption' });
        }

        if (transaction.processedAt) {
            return res.status(400).json({ error: 'Transaction already processed' });
        }

        if (transaction.user.points < transaction.redeemed) {
            return res.status(400).json({ error: 'Insufficient points' });
        }

        // Process redemption
        const updated = await prisma.$transaction(async (tx) => {
            const updatedTransaction = await tx.transaction.update({
                where: { id: transactionId },
                data: {
                    amount: -transaction.redeemed,
                    processedAt: new Date(),
                    processedById: req.auth.sub
                }
            });

            await tx.user.update({
                where: { id: transaction.userId },
                data: { points: { decrement: transaction.redeemed } }
            });

            return updatedTransaction;
        });

        const processor = await prisma.user.findUnique({
            where: { id: req.auth.sub }
        });

        res.json({
            id: updated.id,
            utorid: transaction.user.utorid,
            type: updated.type,
            processedBy: processor.utorid,
            redeemed: updated.redeemed,
            remark: updated.remark ?? '',
            createdBy: transaction.createdBy.utorid
        });
    } catch (error) {
        console.error('Process redemption error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Events routes
const createEventsRouter = require('./src/routes/events');
app.use('/events', createEventsRouter({ prisma, validateRequest, requireRole, hasRoleManager, hasRole, isDefined, isNullish, isPositiveInteger }));



// Promotions routes
const createPromotionsRouter = require('./src/routes/promotions');
app.use('/promotions', createPromotionsRouter({ prisma, validateRequest, requireRole, hasRoleManager, isDefined }));


// ============================================================================
// SERVER STARTUP
// ============================================================================

// Helper: Generate a cryptographically secure URL-safe base64 password
// Equivalent to: base64.urlsafe_b64encode(os.urandom(33)).decode()
const generateSecurePassword = () => {
    const randomBytes = crypto.randomBytes(33);
    return randomBytes.toString('base64url');
};

// Initialize superuser on first launch
const initializeSuperuser = async () => {
    const SUPERUSER_UTORID = process.env.SUPERUSER_UTORID || 'superadm';
    const SUPERUSER_EMAIL = process.env.SUPERUSER_EMAIL || 'admin@utoronto.ca';
    const SUPERUSER_PASSWORD = process.env.SUPERUSER_PASSWORD;

    // Validate UTORid format (must be 7-8 alphanumeric characters)
    if (!isValidUtorid(SUPERUSER_UTORID)) {
        console.error(`Invalid SUPERUSER_UTORID: '${SUPERUSER_UTORID}'(must be 7 - 8 alphanumeric characters)`);
        return;
    }

    try {
        // Check if any superuser exists
        const existingSuperuser = await prisma.user.findFirst({
            where: { role: 'superuser' }
        });

        if (existingSuperuser) {
            console.log(`Superuser already exists: ${existingSuperuser.utorid} `);
            return;
        }

        // Check if user with this utorid already exists (but not as superuser)
        const existingUser = await prisma.user.findUnique({
            where: { utorid: SUPERUSER_UTORID }
        });

        if (existingUser) {
            // Promote existing user to superuser
            await prisma.user.update({
                where: { id: existingUser.id },
                data: { role: 'superuser', isVerified: true }
            });
            console.log(`Existing user '${SUPERUSER_UTORID}' promoted to superuser`);
            return;
        }

        // Generate password if not provided
        const password = SUPERUSER_PASSWORD || generateSecurePassword();
        const passwordHash = await bcrypt.hash(password, 12);

        // Create new superuser
        const superuser = await prisma.user.create({
            data: {
                utorid: SUPERUSER_UTORID,
                email: SUPERUSER_EMAIL,
                name: 'System Administrator',
                passwordBcrypt: passwordHash,
                role: 'superuser',
                isVerified: true,
                points: 0
            }
        });

        console.log('========================================');
        console.log('SUPERUSER CREATED');
        console.log('========================================');
        console.log(`UTORid:   ${superuser.utorid} `);
        console.log(`Email:    ${superuser.email} `);
        if (!SUPERUSER_PASSWORD) {
            console.log(`Password: ${password} `);
            console.log('');
            console.log('IMPORTANT: Save this password now!');
            console.log('It will not be shown again.');
            console.log('Set SUPERUSER_PASSWORD env var to use a custom password.');
        }
        console.log('');
        // Security warning for non-default superuser UTORid
        const DEFAULT_SUPERUSER_UTORID = 'superadm';
        if (SUPERUSER_UTORID !== DEFAULT_SUPERUSER_UTORID) {
            console.log('⚠️  SECURITY WARNING:');
            console.log(`   You are using a custom superuser UTORid '${SUPERUSER_UTORID}'.`);
            console.log(`   Password reset is only disabled for the default '${DEFAULT_SUPERUSER_UTORID}' account.`);
            console.log('   Since email verification is not implemented, password reset tokens');
            console.log('   are exposed in API responses, which could allow unauthorized access.');
            console.log('   Consider using the default UTORid or implementing email verification.');
            console.log('');
        }
        console.log('========================================');

    } catch (error) {
        if (error.code === 'P2002') {
            console.error('Failed to create superuser: email already in use');
        } else {
            console.error('Failed to initialize superuser:', error.message);
        }
    }
};

// Only start server if not in test mode
if (!isTestEnv) {
    const server = app.listen(port, async () => {
        console.log(`Server running on port ${port} `);
        await initializeSuperuser();
    });

    server.on('error', (err) => {
        console.error(`cannot start server: ${err.message} `);
        process.exit(1);
    });
}

// Export for testing
module.exports = { app, prisma };

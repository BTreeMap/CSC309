#!/usr/bin/env node
'use strict';

require('dotenv').config();

const port = (() => {
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
})();

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
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());

// In-memory rate limiting for password resets
const ResetRateLimits = new Map();

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
// AUTHENTICATION ENDPOINTS
// ============================================================================

// POST /auth/tokens - Login
app.post('/auth/tokens', async (req, res) => {
    try {
        // Validate request
        const validation = validateRequest('POST /auth/tokens', req.body);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        const { utorid, password } = req.body;

        const user = await prisma.user.findUnique({ where: { utorid } });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.passwordBcrypt);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
        });

        const expiresIn = 2 * 60 * 60; // 2 hours in seconds
        const token = jwt.sign(
            { sub: user.id, role: user.role },
            JWT_SECRET,
            { expiresIn }
        );

        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

        res.json({ token, expiresAt });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /auth/resets - Request password reset
app.post('/auth/resets', async (req, res) => {
    try {
        // Validate request
        const validation = validateRequest('POST /auth/resets', req.body);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        const { utorid } = req.body;

        // Security: Block password reset for default superuser account
        // Since email verification is not implemented, password reset tokens are exposed in API responses
        // This prevents unauthorized password resets for the system admin account
        const DEFAULT_SUPERUSER_UTORID = 'superadm';
        if (utorid === DEFAULT_SUPERUSER_UTORID) {
            return res.status(403).json({ error: 'Password reset is disabled for this account' });
        }

        // Rate limiting by IP
        const clientIp = req.ip;
        const now = Date.now();
        const lastReset = ResetRateLimits.get(clientIp);

        if (lastReset && now - lastReset < 60000) {
            return res.status(429).json({ error: 'Too many requests' });
        }

        const user = await prisma.user.findUnique({ where: { utorid } });

        // Always reveal if a user exists because we don't care about leaking user existence.
        // There are many other ways to leak user existence that are non-mitigatable.
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        ResetRateLimits.set(clientIp, now);

        const resetToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        // Delete any existing reset tokens for this user (overwrite)
        await prisma.resetToken.deleteMany({
            where: { userId: user.id }
        });

        await prisma.resetToken.create({
            data: {
                userId: user.id,
                token: resetToken,
                expiry: expiresAt
            }
        });

        res.status(202).json({
            expiresAt: expiresAt.toISOString(),
            resetToken
        });
    } catch (error) {
        console.error('Reset request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /auth/resets/:resetToken - Consume reset token
app.post('/auth/resets/:resetToken', async (req, res) => {
    try {
        // Validate request
        const validation = validateRequest('POST /auth/resets/:resetToken', req.body);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        const { resetToken } = req.params;
        const { utorid, password } = req.body;

        // Find the reset token and its associated user
        const tokenRecord = await prisma.resetToken.findUnique({
            where: { token: resetToken },
            include: { user: true }
        });

        if (!tokenRecord) {
            return res.status(404).json({ error: 'Invalid reset token' });
        }

        // Check expiration
        if (new Date() > tokenRecord.expiry) {
            return res.status(410).json({ error: 'Reset token expired' });
        }

        // Check if utorid matches
        if (tokenRecord.user.utorid !== utorid) {
            return res.status(401).json({ error: 'UTORid does not match reset token' });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        // Update password and delete the token (verification is separate, done by manager)
        await prisma.$transaction([
            prisma.user.update({
                where: { id: tokenRecord.userId },
                data: {
                    passwordBcrypt: passwordHash
                }
            }),
            prisma.resetToken.delete({
                where: { id: tokenRecord.id }
            })
        ]);

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Reset consumption error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================================================
// USER MANAGEMENT ENDPOINTS
// ============================================================================

// POST /users - Create user (Cashier+)
app.post('/users', requireRole('cashier'), async (req, res) => {
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
app.get('/users', requireRole('manager'), async (req, res) => {
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
app.get('/users/me', requireRole('regular'), async (req, res) => {
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
app.patch('/users/me', requireRole('regular'), (req, res, next) => {
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
app.get('/users/lookup/:identifier', requireRole('regular'), async (req, res) => {
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
app.get('/users/:userId', requireRole('cashier'), async (req, res) => {
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
app.patch('/users/:userId', requireRole('manager'), async (req, res) => {
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
app.patch('/users/me/password', requireRole('regular'), async (req, res) => {
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

// ============================================================================
// TRANSACTION ENDPOINTS
// ============================================================================

// POST /transactions - Create purchase or adjustment (Cashier+ / Manager+)
app.post('/transactions', requireRole('cashier'), async (req, res) => {
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
app.get('/transactions', requireRole('manager'), async (req, res) => {
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
app.get('/transactions/:transactionId', requireRole('cashier'), async (req, res) => {
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
app.patch('/transactions/:transactionId/suspicious', requireRole('manager'), async (req, res) => {
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

// ============================================================================
// EVENT ENDPOINTS
// ============================================================================

// POST /events - Create event (Manager+)
app.post('/events', requireRole('manager'), async (req, res) => {
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
app.get('/events', requireRole('regular'), async (req, res) => {
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
app.get('/events/:eventId', requireRole('regular'), async (req, res) => {
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
app.patch('/events/:eventId', requireRole('regular'), async (req, res) => {
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
app.delete('/events/:eventId', requireRole('manager'), async (req, res) => {
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
app.post('/events/:eventId/organizers', requireRole('manager'), async (req, res) => {
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
app.delete('/events/:eventId/organizers/:userId', requireRole('manager'), async (req, res) => {
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
app.post('/events/:eventId/guests/me', requireRole('regular'), async (req, res) => {
    try {
        const eventId = parseInt(req.params.eventId);

        if (isNaN(eventId)) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                guests: true
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
app.delete('/events/:eventId/guests/me', requireRole('regular'), async (req, res) => {
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
app.post('/events/:eventId/guests', requireRole('regular'), async (req, res) => {
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
app.delete('/events/:eventId/guests/:userId', requireRole('manager'), async (req, res) => {
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
app.post('/events/:eventId/transactions', requireRole('regular'), async (req, res) => {
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

// ============================================================================
// PROMOTION ENDPOINTS
// ============================================================================

// POST /promotions - Create promotion (Manager+)
app.post('/promotions', requireRole('manager'), async (req, res) => {
    try {
        // Validate request
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

// GET /promotions - List promotions
app.get('/promotions', requireRole('regular'), async (req, res) => {
    try {
        // Validate request
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

        // Name and type filters available to all users
        if (name) {
            where.name = { contains: name };
        }

        if (type) {
            // Convert "one-time" to "onetime" for database query
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
            // Managers can filter by started/ended
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
        }

        const [count, results] = await Promise.all([
            prisma.promotion.count({ where }),
            prisma.promotion.findMany({
                where,
                skip,
                take: limitNum
            })
        ]);

        // Format results based on user role
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
                return {
                    ...base,
                    startTime: promotion.startTime
                };
            }

            return base;
        });

        res.json({ count, results: formattedResults });
    } catch (error) {
        console.error('List promotions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /promotions/:promotionId - Get promotion details
app.get('/promotions/:promotionId', requireRole('regular'), async (req, res) => {
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

        // Regular users can only see active promotions
        if (!isManager && !isActive) {
            return res.status(404).json({ error: 'Promotion not active' });
        }

        // Build response
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

        // Managers also get startTime
        if (isManager) {
            response.startTime = promotion.startTime;
        }

        res.json(response);
    } catch (error) {
        console.error('Get promotion error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /promotions/:promotionId - Update promotion (Manager+)
app.patch('/promotions/:promotionId', requireRole('manager'), async (req, res) => {
    try {
        // Validate request
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
            updatedFields.type = type; // Keep API format in response
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

        // Return id, name, type + updated fields
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

// DELETE /promotions/:promotionId - Delete promotion (Manager+)
app.delete('/promotions/:promotionId', requireRole('manager'), async (req, res) => {
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

        // Check if promotion has been used or applied to transactions
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

const server = app.listen(port, async () => {
    console.log(`Server running on port ${port} `);
    await initializeSuperuser();
});

server.on('error', (err) => {
    console.error(`cannot start server: ${err.message} `);
    process.exit(1);
});

'use strict';

/**
 * Role hierarchy from lowest to highest privilege
 */
const RoleOrder = ['regular', 'cashier', 'manager', 'superuser'];

/**
 * Map of role name to numeric index for comparison
 */
const RoleOrderMap = RoleOrder.reduce((acc, role, index) => {
    acc.set(role, index);
    return acc;
}, new Map());

/**
 * Allowed image MIME types for avatar uploads
 */
const ALLOWED_AVATAR_MIMES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp'
];

/**
 * Safe MIME types for serving uploaded files
 */
const SAFE_MIME_TYPES = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon'
};

/**
 * Valid transaction types
 */
const VALID_TRANSACTION_TYPES = ['purchase', 'adjustment', 'redemption', 'transfer', 'event'];

/**
 * Valid promotion types
 */
const VALID_PROMOTION_TYPES = ['automatic', 'one-time'];

/**
 * Valid comparison operators for queries
 */
const VALID_OPERATORS = ['gte', 'lte'];

/**
 * Default avatar URL for users without a custom avatar
 */
const DEFAULT_AVATAR_URL = 'https://ragnarok.joefang.org/static/x3prqghikuetgr1ge0q2oijgm7s35nf41.svg';

/**
 * Maximum avatar file size in bytes (5MB)
 */
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

/**
 * JWT expiry in seconds (2 hours)
 */
const JWT_EXPIRY_SECONDS = 2 * 60 * 60;

/**
 * Password reset token expiry in milliseconds (1 hour)
 */
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;

/**
 * Rate limit window for password resets in milliseconds (1 minute)
 */
const RESET_RATE_LIMIT_MS = 60000;

module.exports = {
    RoleOrder,
    RoleOrderMap,
    ALLOWED_AVATAR_MIMES,
    SAFE_MIME_TYPES,
    VALID_TRANSACTION_TYPES,
    VALID_PROMOTION_TYPES,
    VALID_OPERATORS,
    DEFAULT_AVATAR_URL,
    MAX_AVATAR_SIZE,
    JWT_EXPIRY_SECONDS,
    RESET_TOKEN_EXPIRY_MS,
    RESET_RATE_LIMIT_MS
};

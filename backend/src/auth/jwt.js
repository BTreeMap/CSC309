'use strict';

const jwt = require('jsonwebtoken');
const { expressjwt: expressJwt } = require('express-jwt');
const { RoleOrderMap } = require('../config/constants');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Express middleware that extracts and validates JWT from Authorization header.
 * Sets req.auth on success or null if missing/invalid.
 */
const jwtMiddleware = (req, res, next) => {
    expressJwt({
        secret: JWT_SECRET,
        algorithms: ['HS256'],
        credentialsRequired: false
    })(req, res, (err) => {
        if (err && err.name === 'UnauthorizedError') {
            req.auth = null;
        }
        next();
    });
};

/**
 * Check if user role meets minimum role requirement
 * @param {string} minRole - Minimum role name
 * @returns {Function} Validator function that takes userRole and returns boolean
 */
const hasRole = (minRole) => {
    const minRoleIndex = RoleOrderMap.get(minRole);
    if (minRoleIndex === undefined) {
        throw new Error(`Invalid role: ${minRole}`);
    }
    return (userRole) => {
        if (typeof userRole !== 'string') return false;
        const userRoleIndex = RoleOrderMap.get(userRole);
        if (userRoleIndex === undefined) return false;
        return userRoleIndex >= minRoleIndex;
    };
};

/**
 * Convenience checker for manager role
 */
const hasRoleManager = hasRole('manager');

/**
 * Express middleware factory that requires minimum role
 * @param {string} minRole - Minimum role name
 * @returns {Function} Express middleware
 */
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
};

/**
 * Sign a JWT token
 * @param {Object} payload - Token payload
 * @param {number} expiresIn - Expiry in seconds
 * @returns {string} Signed JWT
 */
const signToken = (payload, expiresIn) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

module.exports = {
    jwtMiddleware,
    hasRole,
    hasRoleManager,
    requireRole,
    signToken
};

'use strict';

const {
    RoleOrderMap,
    VALID_TRANSACTION_TYPES,
    VALID_PROMOTION_TYPES,
    VALID_OPERATORS
} = require('../config/constants');

/**
 * Check if role is valid
 * @param {string} role
 * @returns {boolean}
 */
const isValidRole = (role) => RoleOrderMap.has(role);

/**
 * Validate UTORid format (7-8 alphanumeric characters)
 * @param {string} utorid
 * @returns {boolean}
 */
const isValidUtorid = (utorid) =>
    typeof utorid === 'string' && /^[a-zA-Z0-9]{7,8}$/.test(utorid);

/**
 * Validate name (1-50 characters)
 * @param {string} name
 * @returns {boolean}
 */
const isValidName = (name) =>
    typeof name === 'string' && name.length >= 1 && name.length <= 50;

/**
 * Validate UofT email address
 * @param {string} email
 * @returns {boolean}
 */
const isValidUofTEmail = (email) =>
    typeof email === 'string' &&
    (email.endsWith('@mail.utoronto.ca') || email.endsWith('@utoronto.ca'));

/**
 * Validate password complexity
 * @param {string} password
 * @returns {boolean}
 */
const isValidPassword = (password) =>
    typeof password === 'string' &&
    password.length >= 8 &&
    password.length <= 20 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} date
 * @returns {boolean}
 */
const isValidDate = (date) =>
    typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);

/**
 * Validate boolean string for query parameters
 * @param {string} value
 * @returns {boolean}
 */
const isBooleanString = (value) => value === 'true' || value === 'false';

/**
 * Validate ISO 8601 timestamp
 * @param {string} timestamp
 * @returns {boolean}
 */
const isValidISOTimestamp = (timestamp) => {
    if (typeof timestamp !== 'string') return false;
    try {
        const date = new Date(timestamp);
        if (date.toISOString() !== timestamp) {
            console.warn(`Warning: Timestamp "${timestamp}" is not in canonical ISO format "${date.toISOString()}"`);
        }
        return !isNaN(date.getTime());
    } catch {
        return false;
    }
};

/**
 * Validate positive number
 * @param {number} value
 * @returns {boolean}
 */
const isPositiveNumber = (value) => typeof value === 'number' && value > 0;

/**
 * Validate positive integer
 * @param {number} value
 * @returns {boolean}
 */
const isPositiveInteger = (value) =>
    typeof value === 'number' && Number.isInteger(value) && value > 0;

/**
 * Validate non-negative integer (>= 0)
 * @param {number} value
 * @returns {boolean}
 */
const isNonNegativeInteger = (value) =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0;

/**
 * Validate positive integer string for query parameters
 * @param {string} value
 * @returns {boolean}
 */
const isPositiveIntegerString = (value) => {
    if (typeof value !== 'string') return false;
    const num = parseInt(value, 10);
    return !isNaN(num) && num > 0 && num.toString() === value;
};

/**
 * Validate number string for query parameters
 * @param {string} value
 * @returns {boolean}
 */
const isNumberString = (value) => {
    if (typeof value !== 'string') return false;
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
};

/**
 * Validate transaction type
 * @param {string} type
 * @returns {boolean}
 */
const isValidTransactionType = (type) =>
    typeof type === 'string' && VALID_TRANSACTION_TYPES.includes(type);

/**
 * Validate comparison operator
 * @param {string} operator
 * @returns {boolean}
 */
const isValidOperator = (operator) =>
    typeof operator === 'string' && VALID_OPERATORS.includes(operator);

/**
 * Validate array of numbers
 * @param {Array} arr
 * @returns {boolean}
 */
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

/**
 * Validate promotion type
 * @param {string} type
 * @returns {boolean}
 */
const isValidPromotionType = (type) =>
    typeof type === 'string' && VALID_PROMOTION_TYPES.includes(type);

/**
 * Check if value is nullish (null or undefined)
 * @param {*} value
 * @returns {boolean}
 */
const isNullish = (value) => value === null || value === undefined;

/**
 * Check if value is defined (not null/undefined)
 * @param {*} value
 * @returns {boolean}
 */
const isDefined = (value) => !isNullish(value);

/**
 * Create validator that accepts null/undefined or passes inner validator
 * @param {Function} validator
 * @returns {Function}
 */
const isNullableOr = (validator) => (value) => isNullish(value) || validator(value);

/**
 * Validate field against validator (string type name or function)
 * @param {string|Function} validator
 * @param {*} value
 * @returns {boolean}
 */
const validateField = (validator, value) => {
    if (typeof validator === 'string') {
        return typeof value === validator;
    }
    if (typeof validator === 'function') {
        return validator(value);
    }
    throw new Error('Invalid validator type');
};

module.exports = {
    isValidRole,
    isValidUtorid,
    isValidName,
    isValidUofTEmail,
    isValidPassword,
    isValidDate,
    isBooleanString,
    isValidISOTimestamp,
    isPositiveNumber,
    isPositiveInteger,
    isNonNegativeInteger,
    isPositiveIntegerString,
    isNumberString,
    isValidTransactionType,
    isValidOperator,
    isArrayOfNumbers,
    isValidPromotionType,
    isNullish,
    isDefined,
    isNullableOr,
    validateField
};

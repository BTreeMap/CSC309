'use strict';

const {
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
    isNullableOr,
    validateField
} = require('./validators');

/**
 * Endpoint-specific field validation schemas
 */
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

/**
 * Validate request body/query against endpoint schema
 * @param {string} endpointKey - e.g. "POST /auth/tokens"
 * @param {Object} requestBody - req.body or req.query
 * @returns {{ valid: boolean, error?: string }}
 */
const validateRequest = (endpointKey, requestBody) => {
    console.log(`Validating request for endpoint: ${endpointKey} with body:`, requestBody);

    const schema = EndpointValidators[endpointKey];
    if (!schema) {
        console.warn(`No validation schema defined for endpoint: ${endpointKey}`);
        return { valid: true };
    }

    const allowedFields = Object.keys(schema);
    const providedFields = Object.keys(requestBody);
    const extraFields = providedFields.filter((field) => !allowedFields.includes(field));

    if (extraFields.length > 0) {
        console.warn(`Extra fields in request for endpoint ${endpointKey}: ${extraFields.join(', ')}`);
        return { valid: false, error: `Invalid fields in request: ${extraFields.join(', ')}` };
    }

    for (const [fieldName, fieldConfig] of Object.entries(schema)) {
        const value = requestBody[fieldName];

        if (value === undefined || value === null) {
            if (fieldConfig.required) {
                console.warn(`Missing required field in request for endpoint ${endpointKey}: ${fieldName}`);
                return { valid: false, error: `Missing required field: ${fieldName}` };
            }
            console.log(`Optional field not provided in request for endpoint ${endpointKey}: ${fieldName}`);
        } else {
            if (!validateField(fieldConfig.validator, value)) {
                console.warn(`Invalid value for field in request for endpoint ${endpointKey}: ${fieldName} = ${value}`);
                return { valid: false, error: `Invalid value for field: ${fieldName}` };
            }
        }
    }

    return { valid: true };
};

module.exports = {
    EndpointValidators,
    validateRequest
};

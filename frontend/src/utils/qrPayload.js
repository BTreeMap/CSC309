/**
 * QR Code Payload Utilities
 *
 * This module provides a standardized protocol for encoding and decoding
 * QR code payloads used throughout the application. All QR codes should
 * use these utilities to ensure consistency between qrcode.react (generation)
 * and qr-scanner (scanning).
 *
 * Payload Format (JSON):
 * {
 *   "v": 1,                    // Protocol version
 *   "t": "user" | "redemption", // Payload type
 *   "d": { ... }               // Type-specific data
 * }
 */

// Protocol version - increment when payload format changes
export const QR_PROTOCOL_VERSION = 1;

// Payload types
export const QR_PAYLOAD_TYPES = Object.freeze({
    USER: 'user',
    REDEMPTION: 'redemption',
});

/**
 * Creates a user QR code payload
 * Used for: MyQRCodePage - customer identification for purchases/transfers
 *
 * @param {Object} user - User object with id, utorid, name, etc.
 * @returns {string} JSON-encoded payload
 */
export const createUserPayload = (user) => {
    if (!user?.id || !user?.utorid) {
        throw new Error('User must have id and utorid');
    }

    const payload = {
        v: QR_PROTOCOL_VERSION,
        t: QR_PAYLOAD_TYPES.USER,
        d: {
            id: user.id,
            utorid: user.utorid,
            name: user.name || null,
        },
    };

    return JSON.stringify(payload);
};

/**
 * Creates a redemption QR code payload
 * Used for: RedemptionQRPage - customer shows to cashier for processing
 *
 * @param {Object} transaction - Redemption transaction object
 * @returns {string} JSON-encoded payload
 */
export const createRedemptionPayload = (transaction) => {
    if (!transaction?.id) {
        throw new Error('Transaction must have an id');
    }

    const amount = transaction.type === 'redemption' && transaction.redeemed !== undefined 
        ? transaction.redeemed 
        : Math.abs(transaction.amount ?? 0);
    
    const payload = {
        v: QR_PROTOCOL_VERSION,
        t: QR_PAYLOAD_TYPES.REDEMPTION,
        d: {
            transactionId: transaction.id,
            amount: amount,
            createdAt: transaction.createdAt,
        },
    };

    return JSON.stringify(payload);
};

/**
 * Parses a scanned QR code payload
 *
 * @param {string} rawData - Raw string from QR scanner
 * @returns {Object} Parsed payload with type and data, or legacy fallback
 */
export const parseQrPayload = (rawData) => {
    if (!rawData || typeof rawData !== 'string') {
        return { isValid: false, error: 'Empty or invalid QR code data' };
    }

    const trimmedData = rawData.trim();
    if (!trimmedData) {
        return { isValid: false, error: 'Empty or invalid QR code data' };
    }

    // Try to parse as JSON (new protocol) - must be an object with our structure
    try {
        const parsed = JSON.parse(trimmedData);

        // Validate it's an object (not just a number or string from JSON.parse)
        if (typeof parsed !== 'object' || parsed === null) {
            // Not our JSON format, try legacy
            return parseLegacyPayload(trimmedData);
        }

        // Validate protocol version
        if (typeof parsed.v !== 'number') {
            return { isValid: false, error: 'Invalid QR code format' };
        }

        // Future-proof: reject unsupported versions
        if (parsed.v > QR_PROTOCOL_VERSION) {
            return {
                isValid: false,
                error: `QR code version ${parsed.v} not supported. Please update the app.`,
            };
        }

        // Validate payload type
        if (!Object.values(QR_PAYLOAD_TYPES).includes(parsed.t)) {
            return { isValid: false, error: 'Unknown QR code type' };
        }

        // Validate data object exists
        if (!parsed.d || typeof parsed.d !== 'object') {
            return { isValid: false, error: 'Invalid QR code data' };
        }

        return {
            isValid: true,
            version: parsed.v,
            type: parsed.t,
            data: parsed.d,
        };
    } catch {
        // Not JSON - try legacy format (plain ID)
        return parseLegacyPayload(trimmedData);
    }
};

/**
 * Parses legacy QR codes (plain ID format for backward compatibility)
 *
 * @param {string} data - Raw string that's not JSON
 * @returns {Object} Parsed payload or error
 */
const parseLegacyPayload = (data) => {
    // Check if it's a plain numeric ID (could be user ID or transaction ID)
    if (/^\d+$/.test(data)) {
        // We can't determine the type from just a number
        // The calling code needs to handle this based on context
        return {
            isValid: true,
            isLegacy: true,
            type: null, // Unknown - context-dependent
            data: { id: parseInt(data, 10) },
            rawValue: data,
        };
    }

    // Check if it's a UTORid (alphanumeric, typically 8 chars)
    if (/^[a-zA-Z0-9]{4,20}$/.test(data)) {
        return {
            isValid: true,
            isLegacy: true,
            type: QR_PAYLOAD_TYPES.USER,
            data: { utorid: data.toLowerCase() },
            rawValue: data,
        };
    }

    return { isValid: false, error: 'Unrecognized QR code format' };
};

/**
 * Extracts user identifier from a parsed payload
 * Returns either utorid or id depending on what's available
 *
 * @param {Object} payload - Parsed QR payload from parseQrPayload
 * @returns {string|number|null} User identifier or null
 */
export const extractUserIdentifier = (payload) => {
    if (!payload?.isValid) return null;

    if (payload.type === QR_PAYLOAD_TYPES.USER) {
        return payload.data.utorid || payload.data.id;
    }

    // Legacy format
    if (payload.isLegacy) {
        return payload.data.utorid || payload.data.id || payload.rawValue;
    }

    return null;
};

/**
 * Extracts transaction ID from a parsed payload
 *
 * @param {Object} payload - Parsed QR payload from parseQrPayload
 * @returns {number|null} Transaction ID or null
 */
export const extractTransactionId = (payload) => {
    if (!payload?.isValid) return null;

    if (payload.type === QR_PAYLOAD_TYPES.REDEMPTION) {
        return payload.data.transactionId;
    }

    // Legacy format - could be a transaction ID
    if (payload.isLegacy && payload.data.id) {
        return payload.data.id;
    }

    return null;
};

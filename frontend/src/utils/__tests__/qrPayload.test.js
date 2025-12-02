import { describe, it, expect } from 'vitest';
import {
    QR_PROTOCOL_VERSION,
    QR_PAYLOAD_TYPES,
    createUserPayload,
    createRedemptionPayload,
    parseQrPayload,
    extractUserIdentifier,
    extractTransactionId,
} from '../qrPayload';

describe('QR Payload Utilities', () => {
    describe('Constants', () => {
        it('should export protocol version', () => {
            expect(typeof QR_PROTOCOL_VERSION).toBe('number');
            expect(QR_PROTOCOL_VERSION).toBeGreaterThan(0);
        });

        it('should export payload types', () => {
            expect(QR_PAYLOAD_TYPES.USER).toBe('user');
            expect(QR_PAYLOAD_TYPES.REDEMPTION).toBe('redemption');
        });

        it('should have frozen payload types', () => {
            expect(Object.isFrozen(QR_PAYLOAD_TYPES)).toBe(true);
        });
    });

    describe('createUserPayload', () => {
        it('should create valid JSON payload for user', () => {
            const user = { id: 123, utorid: 'testuser', name: 'Test User' };
            const payload = createUserPayload(user);
            const parsed = JSON.parse(payload);

            expect(parsed.v).toBe(QR_PROTOCOL_VERSION);
            expect(parsed.t).toBe(QR_PAYLOAD_TYPES.USER);
            expect(parsed.d.id).toBe(123);
            expect(parsed.d.utorid).toBe('testuser');
            expect(parsed.d.name).toBe('Test User');
        });

        it('should handle user without name', () => {
            const user = { id: 456, utorid: 'noname' };
            const payload = createUserPayload(user);
            const parsed = JSON.parse(payload);

            expect(parsed.d.name).toBeNull();
        });

        it('should throw for user without id', () => {
            expect(() => createUserPayload({ utorid: 'test' })).toThrow();
        });

        it('should throw for user without utorid', () => {
            expect(() => createUserPayload({ id: 123 })).toThrow();
        });

        it('should throw for null user', () => {
            expect(() => createUserPayload(null)).toThrow();
        });
    });

    describe('createRedemptionPayload', () => {
        it('should create valid JSON payload for redemption', () => {
            const transaction = {
                id: 789,
                amount: -500,
                createdAt: '2024-01-15T10:00:00Z',
            };
            const payload = createRedemptionPayload(transaction);
            const parsed = JSON.parse(payload);

            expect(parsed.v).toBe(QR_PROTOCOL_VERSION);
            expect(parsed.t).toBe(QR_PAYLOAD_TYPES.REDEMPTION);
            expect(parsed.d.transactionId).toBe(789);
            expect(parsed.d.amount).toBe(500); // Absolute value
            expect(parsed.d.createdAt).toBe('2024-01-15T10:00:00Z');
        });

        it('should throw for transaction without id', () => {
            expect(() => createRedemptionPayload({ amount: -100 })).toThrow();
        });

        it('should throw for null transaction', () => {
            expect(() => createRedemptionPayload(null)).toThrow();
        });
    });

    describe('parseQrPayload', () => {
        it('should parse valid user payload', () => {
            const payload = JSON.stringify({
                v: 1,
                t: 'user',
                d: { id: 123, utorid: 'testuser', name: 'Test' },
            });
            const result = parseQrPayload(payload);

            expect(result.isValid).toBe(true);
            expect(result.type).toBe('user');
            expect(result.version).toBe(1);
            expect(result.data.id).toBe(123);
        });

        it('should parse valid redemption payload', () => {
            const payload = JSON.stringify({
                v: 1,
                t: 'redemption',
                d: { transactionId: 456, amount: 100 },
            });
            const result = parseQrPayload(payload);

            expect(result.isValid).toBe(true);
            expect(result.type).toBe('redemption');
            expect(result.data.transactionId).toBe(456);
        });

        it('should reject unsupported protocol version', () => {
            const payload = JSON.stringify({
                v: 999,
                t: 'user',
                d: { id: 1 },
            });
            const result = parseQrPayload(payload);

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('not supported');
        });

        it('should reject unknown payload type', () => {
            const payload = JSON.stringify({
                v: 1,
                t: 'unknown',
                d: { id: 1 },
            });
            const result = parseQrPayload(payload);

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('Unknown');
        });

        it('should handle invalid JSON gracefully', () => {
            // Non-JSON strings that don't match legacy patterns return invalid
            const result = parseQrPayload('not json {');

            // This doesn't match the UTORid pattern (has spaces and brackets)
            expect(result.isValid).toBe(false);
        });

        it('should handle empty string', () => {
            const result = parseQrPayload('');

            expect(result.isValid).toBe(false);
        });

        it('should handle null', () => {
            const result = parseQrPayload(null);

            expect(result.isValid).toBe(false);
        });

        it('should parse legacy numeric ID', () => {
            const result = parseQrPayload('12345');

            expect(result.isValid).toBe(true);
            expect(result.isLegacy).toBe(true);
            expect(result.data.id).toBe(12345);
        });

        it('should parse legacy UTORid format', () => {
            const result = parseQrPayload('testuser');

            expect(result.isValid).toBe(true);
            expect(result.isLegacy).toBe(true);
            expect(result.type).toBe('user');
            expect(result.data.utorid).toBe('testuser');
        });

        it('should handle whitespace around JSON', () => {
            const payload = `  {"v": 1, "t": "user", "d": {"id": 123, "utorid": "test"}}  `;
            const result = parseQrPayload(payload);

            expect(result.isValid).toBe(true);
            expect(result.type).toBe('user');
        });
    });

    describe('extractUserIdentifier', () => {
        it('should extract utorid from user payload', () => {
            const payload = parseQrPayload(JSON.stringify({
                v: 1,
                t: 'user',
                d: { id: 123, utorid: 'myutorid', name: 'Test' },
            }));

            expect(extractUserIdentifier(payload)).toBe('myutorid');
        });

        it('should extract id when utorid not available', () => {
            const payload = {
                isValid: true,
                type: 'user',
                data: { id: 456 },
            };

            expect(extractUserIdentifier(payload)).toBe(456);
        });

        it('should extract from legacy payload', () => {
            const payload = parseQrPayload('legacyuser');

            expect(extractUserIdentifier(payload)).toBe('legacyuser');
        });

        it('should return null for invalid payload', () => {
            expect(extractUserIdentifier(null)).toBeNull();
            expect(extractUserIdentifier({ isValid: false })).toBeNull();
        });

        it('should return null for redemption payload', () => {
            const payload = parseQrPayload(JSON.stringify({
                v: 1,
                t: 'redemption',
                d: { transactionId: 789 },
            }));

            expect(extractUserIdentifier(payload)).toBeNull();
        });
    });

    describe('extractTransactionId', () => {
        it('should extract transaction ID from redemption payload', () => {
            const payload = parseQrPayload(JSON.stringify({
                v: 1,
                t: 'redemption',
                d: { transactionId: 999, amount: 50 },
            }));

            expect(extractTransactionId(payload)).toBe(999);
        });

        it('should extract from legacy numeric payload (context-dependent)', () => {
            // Legacy numeric IDs with type=null can be transaction IDs
            const payload = {
                isValid: true,
                isLegacy: true,
                type: null,
                data: { id: 54321 },
                rawValue: '54321',
            };

            expect(extractTransactionId(payload)).toBe(54321);
        });

        it('should return null for invalid payload', () => {
            expect(extractTransactionId(null)).toBeNull();
            expect(extractTransactionId({ isValid: false })).toBeNull();
        });

        it('should return null for user payload', () => {
            const payload = parseQrPayload(JSON.stringify({
                v: 1,
                t: 'user',
                d: { id: 123, utorid: 'test' },
            }));

            expect(extractTransactionId(payload)).toBeNull();
        });
    });

    describe('Round-trip compatibility', () => {
        it('should correctly round-trip user payload', () => {
            const originalUser = { id: 42, utorid: 'roundtrip', name: 'Round Trip User' };
            const encoded = createUserPayload(originalUser);
            const decoded = parseQrPayload(encoded);

            expect(decoded.isValid).toBe(true);
            expect(decoded.type).toBe(QR_PAYLOAD_TYPES.USER);
            expect(decoded.data.id).toBe(originalUser.id);
            expect(decoded.data.utorid).toBe(originalUser.utorid);
            expect(decoded.data.name).toBe(originalUser.name);
            expect(extractUserIdentifier(decoded)).toBe(originalUser.utorid);
        });

        it('should correctly round-trip redemption payload', () => {
            const originalTxn = { id: 1001, amount: -250, createdAt: '2024-06-15T14:30:00Z' };
            const encoded = createRedemptionPayload(originalTxn);
            const decoded = parseQrPayload(encoded);

            expect(decoded.isValid).toBe(true);
            expect(decoded.type).toBe(QR_PAYLOAD_TYPES.REDEMPTION);
            expect(decoded.data.transactionId).toBe(originalTxn.id);
            expect(decoded.data.amount).toBe(250); // Absolute value
            expect(extractTransactionId(decoded)).toBe(originalTxn.id);
        });
    });
});

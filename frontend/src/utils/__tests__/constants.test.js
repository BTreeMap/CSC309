import { describe, it, expect } from 'vitest';
import {
    ROLES,
    ROLE_HIERARCHY,
    ROLE_LABELS,
    TRANSACTION_TYPES,
    TRANSACTION_TYPE_LABELS,
    TRANSACTION_TYPE_COLORS,
    PROMOTION_TYPES,
    PROMOTION_TYPE_LABELS,
    EVENT_STATUSES,
    PAGINATION_DEFAULTS,
    DATE_FORMATS,
    POINTS_CONFIG,
    hasMinimumRole,
    getRoleLabel,
    getTransactionTypeLabel,
    getTransactionTypeColor,
    getAvailableRoles,
    formatPoints,
    formatDate,
    formatDateTime,
    isValidEmail,
    isValidUtorid,
    truncateText,
    parseQueryParams,
    buildQueryString,
} from '../constants';

describe('Constants', () => {
    describe('ROLES', () => {
        it('should have all expected role values', () => {
            expect(ROLES.REGULAR).toBe('regular');
            expect(ROLES.CASHIER).toBe('cashier');
            expect(ROLES.MANAGER).toBe('manager');
            expect(ROLES.SUPERUSER).toBe('superuser');
        });

        it('should have exactly 4 roles', () => {
            expect(Object.keys(ROLES)).toHaveLength(4);
        });

        it('should have unique role values', () => {
            const values = Object.values(ROLES);
            const uniqueValues = new Set(values);
            expect(uniqueValues.size).toBe(values.length);
        });

        it('should have all uppercase keys', () => {
            Object.keys(ROLES).forEach(key => {
                expect(key).toBe(key.toUpperCase());
            });
        });

        it('should have all lowercase values', () => {
            Object.values(ROLES).forEach(value => {
                expect(value).toBe(value.toLowerCase());
            });
        });
    });

    describe('ROLE_HIERARCHY', () => {
        it('should have hierarchy levels for all roles', () => {
            expect(ROLE_HIERARCHY.regular).toBe(0);
            expect(ROLE_HIERARCHY.cashier).toBe(1);
            expect(ROLE_HIERARCHY.manager).toBe(2);
            expect(ROLE_HIERARCHY.superuser).toBe(3);
        });

        it('should have ascending hierarchy levels', () => {
            expect(ROLE_HIERARCHY.regular).toBeLessThan(ROLE_HIERARCHY.cashier);
            expect(ROLE_HIERARCHY.cashier).toBeLessThan(ROLE_HIERARCHY.manager);
            expect(ROLE_HIERARCHY.manager).toBeLessThan(ROLE_HIERARCHY.superuser);
        });

        it('should have same keys as ROLES values', () => {
            const roleValues = Object.values(ROLES).sort();
            const hierarchyKeys = Object.keys(ROLE_HIERARCHY).sort();
            expect(roleValues).toEqual(hierarchyKeys);
        });
    });

    describe('ROLE_LABELS', () => {
        it('should have labels for all roles', () => {
            expect(ROLE_LABELS.regular).toBe('Regular User');
            expect(ROLE_LABELS.cashier).toBe('Cashier');
            expect(ROLE_LABELS.manager).toBe('Manager');
            expect(ROLE_LABELS.superuser).toBe('Superuser');
        });

        it('should have same keys as ROLES values', () => {
            const roleValues = Object.values(ROLES).sort();
            const labelKeys = Object.keys(ROLE_LABELS).sort();
            expect(roleValues).toEqual(labelKeys);
        });
    });

    describe('TRANSACTION_TYPES', () => {
        it('should have all expected transaction type values', () => {
            expect(TRANSACTION_TYPES.PURCHASE).toBe('purchase');
            expect(TRANSACTION_TYPES.REDEMPTION).toBe('redemption');
            expect(TRANSACTION_TYPES.ADJUSTMENT).toBe('adjustment');
            expect(TRANSACTION_TYPES.TRANSFER).toBe('transfer');
            expect(TRANSACTION_TYPES.EVENT).toBe('event');
        });

        it('should have exactly 5 transaction types', () => {
            expect(Object.keys(TRANSACTION_TYPES)).toHaveLength(5);
        });

        it('should have unique transaction type values', () => {
            const values = Object.values(TRANSACTION_TYPES);
            const uniqueValues = new Set(values);
            expect(uniqueValues.size).toBe(values.length);
        });

        it('should have all uppercase keys', () => {
            Object.keys(TRANSACTION_TYPES).forEach(key => {
                expect(key).toBe(key.toUpperCase());
            });
        });

        it('should have all lowercase values', () => {
            Object.values(TRANSACTION_TYPES).forEach(value => {
                expect(value).toBe(value.toLowerCase());
            });
        });
    });

    describe('TRANSACTION_TYPE_LABELS', () => {
        it('should have labels for all transaction types', () => {
            Object.values(TRANSACTION_TYPES).forEach(type => {
                expect(TRANSACTION_TYPE_LABELS[type]).toBeDefined();
                expect(typeof TRANSACTION_TYPE_LABELS[type]).toBe('string');
            });
        });

        it('should have human-readable labels (capitalized)', () => {
            expect(TRANSACTION_TYPE_LABELS.purchase).toBe('Purchase');
            expect(TRANSACTION_TYPE_LABELS.redemption).toBe('Redemption');
            expect(TRANSACTION_TYPE_LABELS.adjustment).toBe('Adjustment');
            expect(TRANSACTION_TYPE_LABELS.transfer).toBe('Transfer');
            expect(TRANSACTION_TYPE_LABELS.event).toBe('Event');
        });

        it('should have non-empty labels', () => {
            Object.values(TRANSACTION_TYPE_LABELS).forEach(label => {
                expect(label.length).toBeGreaterThan(0);
            });
        });

        it('should have same number of labels as transaction types', () => {
            expect(Object.keys(TRANSACTION_TYPE_LABELS)).toHaveLength(
                Object.keys(TRANSACTION_TYPES).length
            );
        });
    });

    describe('TRANSACTION_TYPE_COLORS', () => {
        it('should have colors for all transaction types', () => {
            Object.values(TRANSACTION_TYPES).forEach(type => {
                expect(TRANSACTION_TYPE_COLORS[type]).toBeDefined();
                expect(typeof TRANSACTION_TYPE_COLORS[type]).toBe('string');
            });
        });

        it('should have valid hex color format', () => {
            const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
            Object.values(TRANSACTION_TYPE_COLORS).forEach(color => {
                expect(color).toMatch(hexColorRegex);
            });
        });

        it('should have specific colors for each type', () => {
            expect(TRANSACTION_TYPE_COLORS.purchase).toBe('#4CAF50');
            expect(TRANSACTION_TYPE_COLORS.redemption).toBe('#FF9800');
            expect(TRANSACTION_TYPE_COLORS.adjustment).toBe('#2196F3');
            expect(TRANSACTION_TYPE_COLORS.transfer).toBe('#9C27B0');
            expect(TRANSACTION_TYPE_COLORS.event).toBe('#00BCD4');
        });

        it('should have same number of colors as transaction types', () => {
            expect(Object.keys(TRANSACTION_TYPE_COLORS)).toHaveLength(
                Object.keys(TRANSACTION_TYPES).length
            );
        });

        it('should have unique colors for each transaction type', () => {
            const colors = Object.values(TRANSACTION_TYPE_COLORS);
            const uniqueColors = new Set(colors);
            expect(uniqueColors.size).toBe(colors.length);
        });
    });

    describe('PROMOTION_TYPES', () => {
        it('should have all expected promotion type values', () => {
            expect(PROMOTION_TYPES.AUTOMATIC).toBe('automatic');
            expect(PROMOTION_TYPES.ONETIME).toBe('onetime');
        });

        it('should have exactly 2 promotion types', () => {
            expect(Object.keys(PROMOTION_TYPES)).toHaveLength(2);
        });

        it('should have unique promotion type values', () => {
            const values = Object.values(PROMOTION_TYPES);
            const uniqueValues = new Set(values);
            expect(uniqueValues.size).toBe(values.length);
        });

        it('should have all uppercase keys', () => {
            Object.keys(PROMOTION_TYPES).forEach(key => {
                expect(key).toBe(key.toUpperCase());
            });
        });

        it('should have all lowercase values', () => {
            Object.values(PROMOTION_TYPES).forEach(value => {
                expect(value).toBe(value.toLowerCase());
            });
        });
    });

    describe('PROMOTION_TYPE_LABELS', () => {
        it('should have labels for all promotion types', () => {
            expect(PROMOTION_TYPE_LABELS.automatic).toBe('Automatic');
            expect(PROMOTION_TYPE_LABELS.onetime).toBe('One-time');
        });

        it('should have same keys as PROMOTION_TYPES values', () => {
            const typeValues = Object.values(PROMOTION_TYPES).sort();
            const labelKeys = Object.keys(PROMOTION_TYPE_LABELS).sort();
            expect(typeValues).toEqual(labelKeys);
        });
    });

    describe('EVENT_STATUSES', () => {
        it('should have all expected status values', () => {
            expect(EVENT_STATUSES.UPCOMING).toBe('upcoming');
            expect(EVENT_STATUSES.ONGOING).toBe('ongoing');
            expect(EVENT_STATUSES.PAST).toBe('past');
        });
    });

    describe('PAGINATION_DEFAULTS', () => {
        it('should have default page size', () => {
            expect(PAGINATION_DEFAULTS.PAGE_SIZE).toBe(10);
        });

        it('should have page size options array', () => {
            expect(Array.isArray(PAGINATION_DEFAULTS.PAGE_SIZE_OPTIONS)).toBe(true);
            expect(PAGINATION_DEFAULTS.PAGE_SIZE_OPTIONS).toContain(10);
        });
    });

    describe('DATE_FORMATS', () => {
        it('should have SHORT, LONG, and WITH_TIME formats', () => {
            expect(DATE_FORMATS.SHORT).toBeDefined();
            expect(DATE_FORMATS.LONG).toBeDefined();
            expect(DATE_FORMATS.WITH_TIME).toBeDefined();
        });
    });

    describe('POINTS_CONFIG', () => {
        it('should have points per dollar configuration', () => {
            expect(POINTS_CONFIG.POINTS_PER_DOLLAR).toBe(4);
        });
    });
});

describe('Utility Functions', () => {
    describe('hasMinimumRole', () => {
        it('should return true when user role equals minimum role', () => {
            expect(hasMinimumRole('regular', 'regular')).toBe(true);
            expect(hasMinimumRole('cashier', 'cashier')).toBe(true);
            expect(hasMinimumRole('manager', 'manager')).toBe(true);
            expect(hasMinimumRole('superuser', 'superuser')).toBe(true);
        });

        it('should return true when user role exceeds minimum role', () => {
            expect(hasMinimumRole('cashier', 'regular')).toBe(true);
            expect(hasMinimumRole('manager', 'regular')).toBe(true);
            expect(hasMinimumRole('manager', 'cashier')).toBe(true);
            expect(hasMinimumRole('superuser', 'regular')).toBe(true);
            expect(hasMinimumRole('superuser', 'manager')).toBe(true);
        });

        it('should return false when user role is below minimum role', () => {
            expect(hasMinimumRole('regular', 'cashier')).toBe(false);
            expect(hasMinimumRole('regular', 'manager')).toBe(false);
            expect(hasMinimumRole('cashier', 'manager')).toBe(false);
            expect(hasMinimumRole('manager', 'superuser')).toBe(false);
        });

        it('should return false for invalid user role', () => {
            expect(hasMinimumRole('invalid', 'regular')).toBe(false);
            expect(hasMinimumRole(null, 'regular')).toBe(false);
            expect(hasMinimumRole(undefined, 'regular')).toBe(false);
        });

        it('should return false for invalid minimum role', () => {
            expect(hasMinimumRole('regular', 'invalid')).toBe(false);
            expect(hasMinimumRole('superuser', 'invalid')).toBe(false);
        });
    });

    describe('getRoleLabel', () => {
        it('should return correct labels for all roles', () => {
            expect(getRoleLabel('regular')).toBe('Regular User');
            expect(getRoleLabel('cashier')).toBe('Cashier');
            expect(getRoleLabel('manager')).toBe('Manager');
            expect(getRoleLabel('superuser')).toBe('Superuser');
        });

        it('should return the input for unknown roles', () => {
            expect(getRoleLabel('unknown')).toBe('unknown');
            expect(getRoleLabel('admin')).toBe('admin');
        });

        it('should handle empty string', () => {
            expect(getRoleLabel('')).toBe('');
        });
    });

    describe('getTransactionTypeLabel', () => {
        it('should return correct labels for all transaction types', () => {
            expect(getTransactionTypeLabel('purchase')).toBe('Purchase');
            expect(getTransactionTypeLabel('redemption')).toBe('Redemption');
            expect(getTransactionTypeLabel('adjustment')).toBe('Adjustment');
            expect(getTransactionTypeLabel('transfer')).toBe('Transfer');
            expect(getTransactionTypeLabel('event')).toBe('Event');
        });

        it('should return the input for unknown types', () => {
            expect(getTransactionTypeLabel('unknown')).toBe('unknown');
        });
    });

    describe('getTransactionTypeColor', () => {
        it('should return correct colors for all transaction types', () => {
            expect(getTransactionTypeColor('purchase')).toBe('#4CAF50');
            expect(getTransactionTypeColor('redemption')).toBe('#FF9800');
            expect(getTransactionTypeColor('adjustment')).toBe('#2196F3');
            expect(getTransactionTypeColor('transfer')).toBe('#9C27B0');
            expect(getTransactionTypeColor('event')).toBe('#00BCD4');
        });

        it('should return default gray for unknown types', () => {
            expect(getTransactionTypeColor('unknown')).toBe('#757575');
            expect(getTransactionTypeColor('')).toBe('#757575');
        });
    });

    describe('getAvailableRoles', () => {
        it('should return only regular role for regular users', () => {
            const roles = getAvailableRoles('regular');
            expect(roles).toEqual(['regular']);
        });

        it('should return regular and cashier for cashier users', () => {
            const roles = getAvailableRoles('cashier');
            expect(roles).toEqual(['cashier', 'regular']);
        });

        it('should return regular, cashier, and manager for manager users', () => {
            const roles = getAvailableRoles('manager');
            expect(roles).toEqual(['manager', 'cashier', 'regular']);
        });

        it('should return all roles for superuser', () => {
            const roles = getAvailableRoles('superuser');
            expect(roles).toEqual(['superuser', 'manager', 'cashier', 'regular']);
        });

        it('should return empty array for invalid role', () => {
            const roles = getAvailableRoles('invalid');
            expect(roles).toEqual([]);
        });

        it('should return roles in descending hierarchy order', () => {
            const roles = getAvailableRoles('superuser');
            for (let i = 0; i < roles.length - 1; i++) {
                expect(ROLE_HIERARCHY[roles[i]]).toBeGreaterThan(ROLE_HIERARCHY[roles[i + 1]]);
            }
        });
    });

    describe('formatPoints', () => {
        it('should format positive numbers with locale separators', () => {
            expect(formatPoints(1000)).toBe('1,000');
            expect(formatPoints(1000000)).toBe('1,000,000');
        });

        it('should format zero correctly', () => {
            expect(formatPoints(0)).toBe('0');
        });

        it('should format negative numbers correctly', () => {
            expect(formatPoints(-1000)).toBe('-1,000');
        });

        it('should return "0" for non-number inputs', () => {
            expect(formatPoints('1000')).toBe('0');
            expect(formatPoints(null)).toBe('0');
            expect(formatPoints(undefined)).toBe('0');
            expect(formatPoints(NaN)).toBe('0');
        });

        it('should handle decimal numbers', () => {
            expect(formatPoints(1000.5)).toBe('1,000.5');
        });
    });

    describe('formatDate', () => {
        it('should format Date objects', () => {
            // Use explicit time to avoid timezone issues
            const date = new Date(2024, 0, 15); // January 15, 2024
            const formatted = formatDate(date);
            expect(formatted).toContain('Jan');
            expect(formatted).toContain('15');
            expect(formatted).toContain('2024');
        });

        it('should format date strings', () => {
            // Use ISO format with time to avoid timezone ambiguity
            const formatted = formatDate('2024-01-15T12:00:00');
            expect(formatted).toContain('Jan');
            expect(formatted).toContain('15');
            expect(formatted).toContain('2024');
        });

        it('should return empty string for null/undefined', () => {
            expect(formatDate(null)).toBe('');
            expect(formatDate(undefined)).toBe('');
        });

        it('should return empty string for invalid dates', () => {
            expect(formatDate('invalid-date')).toBe('');
            expect(formatDate('not a date')).toBe('');
        });

        it('should accept custom options', () => {
            const date = new Date(2024, 0, 15); // January 15, 2024
            const formatted = formatDate(date, { month: 'long' });
            expect(formatted).toContain('January');
        });
    });

    describe('formatDateTime', () => {
        it('should format date with time', () => {
            const date = new Date('2024-01-15T14:30:00');
            const formatted = formatDateTime(date);
            expect(formatted).toContain('Jan');
            expect(formatted).toContain('15');
            expect(formatted).toContain('2024');
            // Should contain time component
            expect(formatted).toMatch(/\d{1,2}:\d{2}/);
        });

        it('should return empty string for invalid dates', () => {
            expect(formatDateTime('invalid')).toBe('');
        });
    });

    describe('isValidEmail', () => {
        it('should return true for valid emails', () => {
            expect(isValidEmail('test@example.com')).toBe(true);
            expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
            expect(isValidEmail('user+tag@example.org')).toBe(true);
        });

        it('should return false for invalid emails', () => {
            expect(isValidEmail('invalid')).toBe(false);
            expect(isValidEmail('invalid@')).toBe(false);
            expect(isValidEmail('@domain.com')).toBe(false);
            expect(isValidEmail('invalid@domain')).toBe(false);
            expect(isValidEmail('invalid @domain.com')).toBe(false);
        });

        it('should return false for non-string inputs', () => {
            expect(isValidEmail(null)).toBe(false);
            expect(isValidEmail(undefined)).toBe(false);
            expect(isValidEmail(123)).toBe(false);
            expect(isValidEmail('')).toBe(false);
        });
    });

    describe('isValidUtorid', () => {
        it('should return true for valid UTORids', () => {
            expect(isValidUtorid('abc123')).toBe(true);
            expect(isValidUtorid('user1234')).toBe(true);
            expect(isValidUtorid('ABCD')).toBe(true);
            expect(isValidUtorid('a1b2c3d4e5')).toBe(true);
        });

        it('should return false for UTORids that are too short', () => {
            expect(isValidUtorid('abc')).toBe(false);
            expect(isValidUtorid('ab')).toBe(false);
            expect(isValidUtorid('a')).toBe(false);
        });

        it('should return false for UTORids that are too long', () => {
            expect(isValidUtorid('abcdefghijk')).toBe(false);
            expect(isValidUtorid('verylongutorid')).toBe(false);
        });

        it('should return false for UTORids with special characters', () => {
            expect(isValidUtorid('abc-123')).toBe(false);
            expect(isValidUtorid('abc_123')).toBe(false);
            expect(isValidUtorid('abc@123')).toBe(false);
            expect(isValidUtorid('abc 123')).toBe(false);
        });

        it('should return false for non-string inputs', () => {
            expect(isValidUtorid(null)).toBe(false);
            expect(isValidUtorid(undefined)).toBe(false);
            expect(isValidUtorid(123456)).toBe(false);
            expect(isValidUtorid('')).toBe(false);
        });
    });

    describe('truncateText', () => {
        it('should not truncate text shorter than maxLength', () => {
            expect(truncateText('Short text', 100)).toBe('Short text');
        });

        it('should truncate text longer than maxLength and add ellipsis', () => {
            expect(truncateText('This is a very long text that should be truncated', 20)).toBe('This is a very long...');
        });

        it('should use default maxLength of 100', () => {
            const longText = 'a'.repeat(150);
            const result = truncateText(longText);
            expect(result.length).toBe(103); // 100 chars + '...'
            expect(result.endsWith('...')).toBe(true);
        });

        it('should return empty string for non-string inputs', () => {
            expect(truncateText(null)).toBe('');
            expect(truncateText(undefined)).toBe('');
            expect(truncateText(123)).toBe('');
        });

        it('should handle empty string', () => {
            expect(truncateText('')).toBe('');
        });

        it('should handle text exactly at maxLength', () => {
            expect(truncateText('12345', 5)).toBe('12345');
        });

        it('should trim trailing whitespace before ellipsis', () => {
            expect(truncateText('Hello world this is test', 12)).toBe('Hello world...');
        });
    });

    describe('parseQueryParams', () => {
        it('should parse query string into object', () => {
            const result = parseQueryParams('?page=1&limit=10');
            expect(result).toEqual({ page: '1', limit: '10' });
        });

        it('should handle query string without question mark', () => {
            const result = parseQueryParams('page=1&limit=10');
            expect(result).toEqual({ page: '1', limit: '10' });
        });

        it('should return empty object for empty string', () => {
            expect(parseQueryParams('')).toEqual({});
        });

        it('should return empty object for null/undefined', () => {
            expect(parseQueryParams(null)).toEqual({});
            expect(parseQueryParams(undefined)).toEqual({});
        });

        it('should handle encoded values', () => {
            const result = parseQueryParams('?name=John%20Doe&search=hello%20world');
            expect(result.name).toBe('John Doe');
            expect(result.search).toBe('hello world');
        });

        it('should handle multiple values for same key (last value wins)', () => {
            const result = parseQueryParams('?key=value1&key=value2');
            expect(result.key).toBe('value2');
        });
    });

    describe('buildQueryString', () => {
        it('should build query string from object', () => {
            const result = buildQueryString({ page: 1, limit: 10 });
            expect(result).toBe('?page=1&limit=10');
        });

        it('should filter out undefined values', () => {
            const result = buildQueryString({ page: 1, limit: undefined });
            expect(result).toBe('?page=1');
        });

        it('should filter out null values', () => {
            const result = buildQueryString({ page: 1, limit: null });
            expect(result).toBe('?page=1');
        });

        it('should filter out empty string values', () => {
            const result = buildQueryString({ page: 1, search: '' });
            expect(result).toBe('?page=1');
        });

        it('should return empty string for empty object', () => {
            expect(buildQueryString({})).toBe('');
        });

        it('should return empty string for null/undefined', () => {
            expect(buildQueryString(null)).toBe('');
            expect(buildQueryString(undefined)).toBe('');
        });

        it('should handle string values', () => {
            const result = buildQueryString({ name: 'John', city: 'Toronto' });
            expect(result).toBe('?name=John&city=Toronto');
        });

        it('should handle boolean values', () => {
            const result = buildQueryString({ active: true, verified: false });
            expect(result).toBe('?active=true&verified=false');
        });

        it('should return empty string when all values are filtered', () => {
            const result = buildQueryString({ a: null, b: undefined, c: '' });
            expect(result).toBe('');
        });
    });
});

describe('Constants Integration', () => {
    it('should have consistent keys between TRANSACTION_TYPES values and TRANSACTION_TYPE_LABELS keys', () => {
        const typeValues = Object.values(TRANSACTION_TYPES);
        const labelKeys = Object.keys(TRANSACTION_TYPE_LABELS);
        expect(typeValues.sort()).toEqual(labelKeys.sort());
    });

    it('should have consistent keys between TRANSACTION_TYPES values and TRANSACTION_TYPE_COLORS keys', () => {
        const typeValues = Object.values(TRANSACTION_TYPES);
        const colorKeys = Object.keys(TRANSACTION_TYPE_COLORS);
        expect(typeValues.sort()).toEqual(colorKeys.sort());
    });

    it('should allow easy lookup of label and color by transaction type', () => {
        const type = TRANSACTION_TYPES.PURCHASE;
        expect(TRANSACTION_TYPE_LABELS[type]).toBe('Purchase');
        expect(TRANSACTION_TYPE_COLORS[type]).toBe('#4CAF50');
    });

    it('should have utility functions that work with constants', () => {
        // Using the constants with utility functions
        const type = TRANSACTION_TYPES.PURCHASE;
        expect(getTransactionTypeLabel(type)).toBe('Purchase');
        expect(getTransactionTypeColor(type)).toBe('#4CAF50');

        const role = ROLES.MANAGER;
        expect(getRoleLabel(role)).toBe('Manager');
        expect(hasMinimumRole(role, ROLES.CASHIER)).toBe(true);
    });
});


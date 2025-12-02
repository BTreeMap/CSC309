/**
 * Application Constants
 *
 * Centralized constants for roles, transaction types, and other
 * application-wide values. All exports are frozen to prevent modification.
 */

// =============================================================================
// USER ROLES
// =============================================================================

export const ROLES = Object.freeze({
  REGULAR: 'regular',
  CASHIER: 'cashier',
  MANAGER: 'manager',
  SUPERUSER: 'superuser',
});

export const ROLE_HIERARCHY = Object.freeze({
  regular: 0,
  cashier: 1,
  manager: 2,
  superuser: 3,
});

export const ROLE_LABELS = Object.freeze({
  regular: 'Regular User',
  cashier: 'Cashier',
  manager: 'Manager',
  superuser: 'Superuser',
});

// =============================================================================
// TRANSACTION TYPES
// =============================================================================

export const TRANSACTION_TYPES = Object.freeze({
  PURCHASE: 'purchase',
  REDEMPTION: 'redemption',
  ADJUSTMENT: 'adjustment',
  TRANSFER: 'transfer',
  EVENT: 'event',
});

export const TRANSACTION_TYPE_LABELS = Object.freeze({
  purchase: 'Purchase',
  redemption: 'Redemption',
  adjustment: 'Adjustment',
  transfer: 'Transfer',
  event: 'Event',
});

export const TRANSACTION_TYPE_COLORS = Object.freeze({
  purchase: '#4CAF50',
  redemption: '#FF9800',
  adjustment: '#2196F3',
  transfer: '#9C27B0',
  event: '#00BCD4',
});

// =============================================================================
// PROMOTIONS
// =============================================================================

export const PROMOTION_TYPES = Object.freeze({
  AUTOMATIC: 'automatic',
  ONETIME: 'onetime',
});

export const PROMOTION_TYPE_LABELS = Object.freeze({
  automatic: 'Automatic',
  onetime: 'One-time',
});

// =============================================================================
// EVENTS
// =============================================================================

export const EVENT_STATUSES = Object.freeze({
  UPCOMING: 'upcoming',
  ONGOING: 'ongoing',
  PAST: 'past',
});

// =============================================================================
// PAGINATION
// =============================================================================

export const PAGINATION_DEFAULTS = Object.freeze({
  PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
});

// =============================================================================
// DATE FORMATS
// =============================================================================

export const DATE_FORMATS = Object.freeze({
  SHORT: { year: 'numeric', month: 'short', day: 'numeric' },
  LONG: { year: 'numeric', month: 'long', day: 'numeric' },
  WITH_TIME: {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
});

// =============================================================================
// POINTS CONFIGURATION
// =============================================================================

export const POINTS_CONFIG = Object.freeze({
  POINTS_PER_DOLLAR: 4, // $0.25 = 1 point → $1 = 4 points
  MIN_REDEMPTION: 1,
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a role meets or exceeds a minimum role requirement
 * @param {string} userRole - The user's current role
 * @param {string} minRole - The minimum required role
 * @returns {boolean} - True if user's role meets or exceeds minimum
 */
export const hasMinimumRole = (userRole, minRole) => {
  const userLevel = ROLE_HIERARCHY[userRole] ?? -1;
  const minLevel = ROLE_HIERARCHY[minRole] ?? Infinity;
  return userLevel >= minLevel;
};

/**
 * Get the display label for a role
 * @param {string} role - The role key
 * @returns {string} - Human-readable role label
 */
export const getRoleLabel = (role) => {
  return ROLE_LABELS[role] || role;
};

/**
 * Get the display label for a transaction type
 * @param {string} type - The transaction type key
 * @returns {string} - Human-readable transaction type label
 */
export const getTransactionTypeLabel = (type) => {
  return TRANSACTION_TYPE_LABELS[type] || type;
};

/**
 * Get the color for a transaction type
 * @param {string} type - The transaction type key
 * @returns {string} - Hex color code
 */
export const getTransactionTypeColor = (type) => {
  return TRANSACTION_TYPE_COLORS[type] || '#757575';
};

/**
 * Get all roles at or below a given role level
 * @param {string} maxRole - The maximum role level
 * @returns {string[]} - Array of role keys
 */
export const getAvailableRoles = (maxRole) => {
  const maxLevel = ROLE_HIERARCHY[maxRole] ?? -1;
  return Object.entries(ROLE_HIERARCHY)
    .filter(([, level]) => level <= maxLevel)
    .map(([role]) => role)
    .sort((a, b) => ROLE_HIERARCHY[b] - ROLE_HIERARCHY[a]);
};

/**
 * Format points with proper number formatting
 * @param {number} points - The points value
 * @returns {string} - Formatted points string
 */
export const formatPoints = (points) => {
  if (typeof points !== 'number' || isNaN(points)) {
    return '0';
  }
  return points.toLocaleString();
};

/**
 * Format date to a readable string
 * @param {string|Date} date - The date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '';

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    return dateObj.toLocaleDateString('en-US', defaultOptions);
  } catch {
    return '';
  }
};

/**
 * Format date and time to a readable string
 * @param {string|Date} date - The date to format
 * @returns {string} - Formatted date and time string
 */
export const formatDateTime = (date) => {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Validate email format
 * @param {string} email - The email to validate
 * @returns {boolean} - True if email format is valid
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate UTORid format (alphanumeric, 4-10 characters)
 * @param {string} utorid - The UTORid to validate
 * @returns {boolean} - True if UTORid format is valid
 */
export const isValidUtorid = (utorid) => {
  if (!utorid || typeof utorid !== 'string') return false;
  const utoridRegex = /^[a-zA-Z0-9]{4,10}$/;
  return utoridRegex.test(utorid);
};

/**
 * Truncate text with ellipsis
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} - Truncated text with ellipsis if needed
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

/**
 * Parse query parameters from URL search string
 * @param {string} search - The URL search string
 * @returns {object} - Object with query parameters
 */
export const parseQueryParams = (search) => {
  if (!search) return {};
  const params = new URLSearchParams(search);
  const result = {};
  for (const [key, value] of params) {
    result[key] = value;
  }
  return result;
};

/**
 * Build query string from parameters object
 * @param {object} params - Object with query parameters
 * @returns {string} - URL query string
 */
export const buildQueryString = (params) => {
  if (!params || typeof params !== 'object') return '';
  const filteredParams = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => [key, String(value)]);

  if (filteredParams.length === 0) return '';
  return '?' + new URLSearchParams(filteredParams).toString();
};



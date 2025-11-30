export const ROLES = {
  REGULAR: 'regular',
  CASHIER: 'cashier',
  MANAGER: 'manager',
  SUPERUSER: 'superuser',
};

export const TRANSACTION_TYPES = {
  PURCHASE: 'purchase',
  REDEMPTION: 'redemption',
  ADJUSTMENT: 'adjustment',
  TRANSFER: 'transfer',
  EVENT: 'event',
};

export const TRANSACTION_TYPE_LABELS = {
  purchase: 'Purchase',
  redemption: 'Redemption',
  adjustment: 'Adjustment',
  transfer: 'Transfer',
  event: 'Event',
};

export const TRANSACTION_TYPE_COLORS = {
  purchase: '#4CAF50',
  redemption: '#FF9800',
  adjustment: '#2196F3',
  transfer: '#9C27B0',
  event: '#00BCD4',
};

export const PROMOTION_TYPES = {
  AUTOMATIC: 'automatic',
  ONETIME: 'onetime',
};

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';


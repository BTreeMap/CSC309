import {
  QrCode,
  ClipboardList,
  Gift,
  Calendar,
  ArrowLeftRight,
  Target,
  CreditCard,
  CheckCircle,
  UserPlus,
  Users,
  BarChart3,
  Tag,
  CalendarCog
} from 'lucide-react';

/**
 * Quick action configuration for the dashboard.
 * Each action defines: path, icon component, and i18n key.
 */

/**
 * Base actions available to all authenticated users
 */
export const baseQuickActions = [
  { to: '/my-qr', Icon: QrCode, i18nKey: 'dashboard:quickActions.myQr' },
  { to: '/transactions', Icon: ClipboardList, i18nKey: 'dashboard:quickActions.myTransactions' },
  { to: '/promotions', Icon: Gift, i18nKey: 'dashboard:quickActions.promotions' },
  { to: '/events', Icon: Calendar, i18nKey: 'dashboard:quickActions.events' },
  { to: '/transfer', Icon: ArrowLeftRight, i18nKey: 'dashboard:quickActions.transfer' },
  { to: '/redeem', Icon: Target, i18nKey: 'dashboard:quickActions.redeem' }
];

/**
 * Actions available to cashier role and above
 */
export const cashierQuickActions = [
  { to: '/cashier/transaction', Icon: CreditCard, i18nKey: 'dashboard:quickActions.createTransaction' },
  { to: '/cashier/redemption', Icon: CheckCircle, i18nKey: 'dashboard:quickActions.processRedemption' },
  { to: '/register', Icon: UserPlus, i18nKey: 'dashboard:quickActions.registerUser' }
];

/**
 * Actions available to manager role and above
 */
export const managerQuickActions = [
  { to: '/users', Icon: Users, i18nKey: 'dashboard:quickActions.manageUsers' },
  { to: '/transactions/all', Icon: BarChart3, i18nKey: 'dashboard:quickActions.allTransactions' },
  { to: '/promotions/manage', Icon: Tag, i18nKey: 'dashboard:quickActions.managePromotions' },
  { to: '/events/manage', Icon: CalendarCog, i18nKey: 'dashboard:quickActions.manageEvents' }
];

/**
 * Get quick actions based on user role
 * @param {string} role - User's active role
 * @returns {Array} Array of quick action configurations
 */
export const getQuickActionsByRole = (role) => {
  if (role === 'superuser' || role === 'manager') {
    return [...baseQuickActions, ...cashierQuickActions, ...managerQuickActions];
  }
  if (role === 'cashier') {
    return [...baseQuickActions, ...cashierQuickActions];
  }
  return baseQuickActions;
};

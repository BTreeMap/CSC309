import { lazyWithPreload } from '../utils/lazyWithPreload';

/**
 * Lazy-loaded page components for code splitting with prefetch support.
 * 
 * Each component exposes a `.preload()` method that can be called on hover/focus
 * to prefetch the component bundle before navigation.
 * 
 * @example
 * // Prefetch on hover:
 * <PrefetchLink to="/dashboard" preload={DashboardPage.preload}>Dashboard</PrefetchLink>
 */
export const LoginPage = lazyWithPreload(() => import('../pages/LoginPage'));
export const ForgotPasswordPage = lazyWithPreload(() => import('../pages/ForgotPasswordPage'));
export const UnauthorizedPage = lazyWithPreload(() => import('../pages/UnauthorizedPage'));
export const DashboardPage = lazyWithPreload(() => import('../pages/DashboardPage'));

// Profile pages
export const ProfilePage = lazyWithPreload(() => import('../pages/ProfilePage'));
export const EditProfilePage = lazyWithPreload(() => import('../pages/EditProfilePage'));
export const ChangePasswordPage = lazyWithPreload(() => import('../pages/ChangePasswordPage'));

// User pages
export const MyQRCodePage = lazyWithPreload(() => import('../pages/MyQRCodePage'));
export const TransferPointsPage = lazyWithPreload(() => import('../pages/TransferPointsPage'));
export const RedemptionPage = lazyWithPreload(() => import('../pages/RedemptionPage'));
export const RedemptionQRPage = lazyWithPreload(() => import('../pages/RedemptionQRPage'));
export const MyTransactionsPage = lazyWithPreload(() => import('../pages/MyTransactionsPage'));

// Promotions pages
export const PromotionsPage = lazyWithPreload(() => import('../pages/PromotionsPage'));
export const PromotionDetailPage = lazyWithPreload(() => import('../pages/PromotionDetailPage'));
export const ManagePromotionsPage = lazyWithPreload(() => import('../pages/ManagePromotionsPage'));

// Events pages
export const EventsPage = lazyWithPreload(() => import('../pages/EventsPage'));
export const EventDetailPage = lazyWithPreload(() => import('../pages/EventDetailPage'));
export const ManageEventsPage = lazyWithPreload(() => import('../pages/ManageEventsPage'));

// Cashier pages
export const CreateTransactionPage = lazyWithPreload(() => import('../pages/CreateTransactionPage'));
export const ProcessRedemptionPage = lazyWithPreload(() => import('../pages/ProcessRedemptionPage'));
export const RegisterPage = lazyWithPreload(() => import('../pages/RegisterPage'));

// Manager pages
export const UsersListPage = lazyWithPreload(() => import('../pages/UsersListPage'));
export const AllTransactionsPage = lazyWithPreload(() => import('../pages/AllTransactionsPage'));

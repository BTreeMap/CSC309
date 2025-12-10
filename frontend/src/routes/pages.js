import { lazy } from 'react';

/**
 * Lazy-loaded page components for code splitting
 */
export const LoginPage = lazy(() => import('../pages/LoginPage'));
export const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage'));
export const UnauthorizedPage = lazy(() => import('../pages/UnauthorizedPage'));
export const DashboardPage = lazy(() => import('../pages/DashboardPage'));

// Profile pages
export const ProfilePage = lazy(() => import('../pages/ProfilePage'));
export const EditProfilePage = lazy(() => import('../pages/EditProfilePage'));
export const ChangePasswordPage = lazy(() => import('../pages/ChangePasswordPage'));

// User pages
export const MyQRCodePage = lazy(() => import('../pages/MyQRCodePage'));
export const TransferPointsPage = lazy(() => import('../pages/TransferPointsPage'));
export const RedemptionPage = lazy(() => import('../pages/RedemptionPage'));
export const RedemptionQRPage = lazy(() => import('../pages/RedemptionQRPage'));
export const MyTransactionsPage = lazy(() => import('../pages/MyTransactionsPage'));

// Promotions pages
export const PromotionsPage = lazy(() => import('../pages/PromotionsPage'));
export const PromotionDetailPage = lazy(() => import('../pages/PromotionDetailPage'));
export const ManagePromotionsPage = lazy(() => import('../pages/ManagePromotionsPage'));

// Events pages
export const EventsPage = lazy(() => import('../pages/EventsPage'));
export const EventDetailPage = lazy(() => import('../pages/EventDetailPage'));
export const ManageEventsPage = lazy(() => import('../pages/ManageEventsPage'));

// Cashier pages
export const CreateTransactionPage = lazy(() => import('../pages/CreateTransactionPage'));
export const ProcessRedemptionPage = lazy(() => import('../pages/ProcessRedemptionPage'));
export const RegisterPage = lazy(() => import('../pages/RegisterPage'));

// Manager pages
export const UsersListPage = lazy(() => import('../pages/UsersListPage'));
export const AllTransactionsPage = lazy(() => import('../pages/AllTransactionsPage'));

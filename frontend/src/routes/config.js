import * as Pages from './pages';

/**
 * Route configuration for the application.
 * Each route defines: path, component, protection requirements, and optional props.
 */

/**
 * Public routes - accessible without authentication
 */
export const publicRoutes = [
    {
        path: '/forgot-password',
        component: Pages.ForgotPasswordPage,
        isPublic: true
    },
    {
        path: '/unauthorized',
        component: Pages.UnauthorizedPage,
        isPublic: true
    }
];

/**
 * Routes that redirect to dashboard if already authenticated
 */
export const guestOnlyRoutes = [
    {
        path: '/login',
        component: Pages.LoginPage
    }
];

/**
 * Protected routes - require authentication
 * minRole defaults to 'regular' if not specified
 */
export const protectedRoutes = [
    // Dashboard
    {
        path: '/dashboard',
        component: Pages.DashboardPage
    },

    // Profile pages
    {
        path: '/profile',
        component: Pages.ProfilePage
    },
    {
        path: '/profile/edit',
        component: Pages.EditProfilePage
    },
    {
        path: '/profile/password',
        component: Pages.ChangePasswordPage
    },

    // User pages
    {
        path: '/my-qr',
        component: Pages.MyQRCodePage
    },
    {
        path: '/transfer',
        component: Pages.TransferPointsPage
    },
    {
        path: '/transactions',
        component: Pages.MyTransactionsPage
    },
    {
        path: '/redeem',
        component: Pages.RedemptionPage
    },
    {
        path: '/redeem/:transactionId/qr',
        component: Pages.RedemptionQRPage
    },

    // Promotions pages
    {
        path: '/promotions',
        component: Pages.PromotionsPage
    },
    {
        path: '/promotions/:id',
        component: Pages.PromotionDetailPage
    },

    // Events pages
    {
        path: '/events',
        component: Pages.EventsPage
    },
    {
        path: '/events/:id',
        component: Pages.EventDetailPage
    },

    // Cashier pages
    {
        path: '/cashier/transaction',
        component: Pages.CreateTransactionPage,
        minRole: 'cashier'
    },
    {
        path: '/cashier/redemption',
        component: Pages.ProcessRedemptionPage,
        minRole: 'cashier'
    },
    {
        path: '/cashier/redemption/:transactionId',
        component: Pages.ProcessRedemptionPage,
        minRole: 'cashier'
    },
    {
        path: '/register',
        component: Pages.RegisterPage,
        minRole: 'cashier'
    },

    // Manager pages
    {
        path: '/users',
        component: Pages.UsersListPage,
        minRole: 'manager'
    },
    {
        path: '/transactions/all',
        component: Pages.AllTransactionsPage,
        minRole: 'manager'
    },
    {
        path: '/promotions/manage',
        component: Pages.ManagePromotionsPage,
        minRole: 'manager'
    },
    {
        path: '/events/manage',
        component: Pages.ManageEventsPage,
        minRole: 'manager'
    }
];

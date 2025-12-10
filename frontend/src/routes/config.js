import * as Pages from './pages';

/**
 * Route configuration for the application.
 * Each route defines: path, component, protection requirements, and optional props.
 * 
 * Components now support `.preload()` for hover-based prefetching.
 */

/**
 * Public routes - accessible without authentication
 */
export const publicRoutes = [
    {
        path: '/forgot-password',
        component: Pages.ForgotPasswordPage,
        preload: Pages.ForgotPasswordPage.preload,
        isPublic: true
    },
    {
        path: '/unauthorized',
        component: Pages.UnauthorizedPage,
        preload: Pages.UnauthorizedPage.preload,
        isPublic: true
    }
];

/**
 * Routes that redirect to dashboard if already authenticated
 */
export const guestOnlyRoutes = [
    {
        path: '/login',
        component: Pages.LoginPage,
        preload: Pages.LoginPage.preload
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
        component: Pages.DashboardPage,
        preload: Pages.DashboardPage.preload
    },

    // Profile pages
    {
        path: '/profile',
        component: Pages.ProfilePage,
        preload: Pages.ProfilePage.preload
    },
    {
        path: '/profile/edit',
        component: Pages.EditProfilePage,
        preload: Pages.EditProfilePage.preload
    },
    {
        path: '/profile/password',
        component: Pages.ChangePasswordPage,
        preload: Pages.ChangePasswordPage.preload
    },

    // User pages
    {
        path: '/my-qr',
        component: Pages.MyQRCodePage,
        preload: Pages.MyQRCodePage.preload
    },
    {
        path: '/transfer',
        component: Pages.TransferPointsPage,
        preload: Pages.TransferPointsPage.preload
    },
    {
        path: '/transactions',
        component: Pages.MyTransactionsPage,
        preload: Pages.MyTransactionsPage.preload
    },
    {
        path: '/redeem',
        component: Pages.RedemptionPage,
        preload: Pages.RedemptionPage.preload
    },
    {
        path: '/redeem/:transactionId/qr',
        component: Pages.RedemptionQRPage,
        preload: Pages.RedemptionQRPage.preload
    },

    // Promotions pages
    {
        path: '/promotions',
        component: Pages.PromotionsPage,
        preload: Pages.PromotionsPage.preload
    },
    {
        path: '/promotions/:id',
        component: Pages.PromotionDetailPage,
        preload: Pages.PromotionDetailPage.preload
    },

    // Events pages
    {
        path: '/events',
        component: Pages.EventsPage,
        preload: Pages.EventsPage.preload
    },
    {
        path: '/events/:id',
        component: Pages.EventDetailPage,
        preload: Pages.EventDetailPage.preload
    },

    // Cashier pages
    {
        path: '/cashier/transaction',
        component: Pages.CreateTransactionPage,
        preload: Pages.CreateTransactionPage.preload,
        minRole: 'cashier'
    },
    {
        path: '/cashier/redemption',
        component: Pages.ProcessRedemptionPage,
        preload: Pages.ProcessRedemptionPage.preload,
        minRole: 'cashier'
    },
    {
        path: '/cashier/redemption/:transactionId',
        component: Pages.ProcessRedemptionPage,
        preload: Pages.ProcessRedemptionPage.preload,
        minRole: 'cashier'
    },
    {
        path: '/register',
        component: Pages.RegisterPage,
        preload: Pages.RegisterPage.preload,
        minRole: 'cashier'
    },

    // Manager pages
    {
        path: '/users',
        component: Pages.UsersListPage,
        preload: Pages.UsersListPage.preload,
        minRole: 'manager'
    },
    {
        path: '/transactions/all',
        component: Pages.AllTransactionsPage,
        preload: Pages.AllTransactionsPage.preload,
        minRole: 'manager'
    },
    {
        path: '/promotions/manage',
        component: Pages.ManagePromotionsPage,
        preload: Pages.ManagePromotionsPage.preload,
        minRole: 'manager'
    },
    {
        path: '/events/manage',
        component: Pages.ManageEventsPage,
        preload: Pages.ManageEventsPage.preload,
        minRole: 'manager'
    }
];

/**
 * Route preload lookup - maps paths to preload functions
 * Use for programmatic prefetching or with PrefetchLink
 */
export const routePreloads = Object.fromEntries([
    ...publicRoutes,
    ...guestOnlyRoutes,
    ...protectedRoutes
].map(route => [route.path, route.preload]));

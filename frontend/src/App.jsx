import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/shared/ToastContext';
import ProtectedRoute from './utils/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import DashboardPage from './pages/DashboardPage';

// Profile pages
import ProfilePage from './pages/ProfilePage';
import EditProfilePage from './pages/EditProfilePage';
import ChangePasswordPage from './pages/ChangePasswordPage';

// User pages
import MyQRCodePage from './pages/MyQRCodePage';
import TransferPointsPage from './pages/TransferPointsPage';
import RedemptionPage from './pages/RedemptionPage';
import RedemptionQRPage from './pages/RedemptionQRPage';
import MyTransactionsPage from './pages/MyTransactionsPage';

// Promotions pages
import PromotionsPage from './pages/PromotionsPage';
import PromotionDetailPage from './pages/PromotionDetailPage';
import ManagePromotionsPage from './pages/ManagePromotionsPage';

// Events pages
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import ManageEventsPage from './pages/ManageEventsPage';

// Cashier pages
import CreateTransactionPage from './pages/CreateTransactionPage';
import ProcessRedemptionPage from './pages/ProcessRedemptionPage';
import RegisterPage from './pages/RegisterPage';

// Manager pages
import UsersListPage from './pages/UsersListPage';
import AllTransactionsPage from './pages/AllTransactionsPage';

import './App.css';

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                }
              />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* Dashboard - all authenticated users */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Profile pages - all authenticated users */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/edit"
                element={
                  <ProtectedRoute>
                    <EditProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/password"
                element={
                  <ProtectedRoute>
                    <ChangePasswordPage />
                  </ProtectedRoute>
                }
              />

              {/* User QR Code page - all authenticated users */}
              <Route
                path="/my-qr"
                element={
                  <ProtectedRoute>
                    <MyQRCodePage />
                  </ProtectedRoute>
                }
              />

              {/* Transfer Points - all authenticated users */}
              <Route
                path="/transfer"
                element={
                  <ProtectedRoute>
                    <TransferPointsPage />
                  </ProtectedRoute>
                }
              />

              {/* My Transactions - all authenticated users */}
              <Route
                path="/transactions"
                element={
                  <ProtectedRoute>
                    <MyTransactionsPage />
                  </ProtectedRoute>
                }
              />

              {/* Redemption pages - all authenticated users */}
              <Route
                path="/redeem"
                element={
                  <ProtectedRoute>
                    <RedemptionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/redeem/:transactionId/qr"
                element={
                  <ProtectedRoute>
                    <RedemptionQRPage />
                  </ProtectedRoute>
                }
              />

              {/* Promotions pages - all authenticated users */}
              <Route
                path="/promotions"
                element={
                  <ProtectedRoute>
                    <PromotionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/promotions/:id"
                element={
                  <ProtectedRoute>
                    <PromotionDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Events pages - all authenticated users */}
              <Route
                path="/events"
                element={
                  <ProtectedRoute>
                    <EventsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events/:id"
                element={
                  <ProtectedRoute>
                    <EventDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Cashier pages - cashier and above */}
              <Route
                path="/cashier/transaction"
                element={
                  <ProtectedRoute minRole="cashier">
                    <CreateTransactionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cashier/redemption"
                element={
                  <ProtectedRoute minRole="cashier">
                    <ProcessRedemptionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cashier/redemption/:transactionId"
                element={
                  <ProtectedRoute minRole="cashier">
                    <ProcessRedemptionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <ProtectedRoute minRole="cashier">
                    <RegisterPage />
                  </ProtectedRoute>
                }
              />

              {/* Manager pages - manager and above */}
              <Route
                path="/users"
                element={
                  <ProtectedRoute minRole="manager">
                    <UsersListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/transactions/all"
                element={
                  <ProtectedRoute minRole="manager">
                    <AllTransactionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/promotions/manage"
                element={
                  <ProtectedRoute minRole="manager">
                    <ManagePromotionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events/manage"
                element={
                  <ProtectedRoute minRole="manager">
                    <ManageEventsPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch all - redirect to dashboard */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;

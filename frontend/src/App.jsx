import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/shared/ToastContext';
import ProtectedRoute from './utils/ProtectedRoute';
import { publicRoutes, guestOnlyRoutes, protectedRoutes } from './routes';

import './App.css';

/**
 * Loading fallback for lazy-loaded routes
 */
const RouteLoading = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh'
  }}>
    Loading...
  </div>
);

/**
 * Wrapper for guest-only routes (redirects to dashboard if authenticated)
 */
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <RouteLoading />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

/**
 * Render a single route element with appropriate wrapper
 */
const renderRouteElement = (route) => {
  const Component = route.component;

  if (route.isPublic) {
    return <Component />;
  }

  if (route.minRole) {
    return (
      <ProtectedRoute minRole={route.minRole}>
        <Component />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Component />
    </ProtectedRoute>
  );
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Suspense fallback={<RouteLoading />}>
            <div className="App">
              <Routes>
                {/* Root redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* Guest-only routes (redirect if authenticated) */}
                {guestOnlyRoutes.map(({ path, component: Component }) => (
                  <Route
                    key={path}
                    path={path}
                    element={
                      <PublicRoute>
                        <Component />
                      </PublicRoute>
                    }
                  />
                ))}

                {/* Public routes (no auth required) */}
                {publicRoutes.map(({ path, component: Component }) => (
                  <Route key={path} path={path} element={<Component />} />
                ))}

                {/* Protected routes */}
                {protectedRoutes.map((route) => (
                  <Route
                    key={route.path}
                    path={route.path}
                    element={renderRouteElement(route)}
                  />
                ))}

                {/* Catch all - redirect to dashboard */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </Suspense>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;

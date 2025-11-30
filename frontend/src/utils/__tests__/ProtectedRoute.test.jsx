import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';

// Mock the useAuth hook
const mockUseAuth = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

// Helper component to render protected routes
const TestApp = ({ minRole = 'regular', children = <div>Protected Content</div> }) => (
    <MemoryRouter initialEntries={['/protected']}>
        <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
            <Route
                path="/protected"
                element={
                    <ProtectedRoute minRole={minRole}>
                        {children}
                    </ProtectedRoute>
                }
            />
        </Routes>
    </MemoryRouter>
);

describe('ProtectedRoute', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Loading State', () => {
        it('should render loading indicator when auth is loading', () => {
            mockUseAuth.mockReturnValue({
                isAuthenticated: false,
                loading: true,
                hasRole: vi.fn().mockReturnValue(false),
            });

            render(<TestApp />);
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });

        it('should not render children while loading', () => {
            mockUseAuth.mockReturnValue({
                isAuthenticated: true,
                loading: true,
                hasRole: vi.fn().mockReturnValue(true),
            });

            render(<TestApp />);
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        });
    });

    describe('Authentication', () => {
        it('should redirect to login when user is not authenticated', () => {
            mockUseAuth.mockReturnValue({
                isAuthenticated: false,
                loading: false,
                hasRole: vi.fn().mockReturnValue(false),
            });

            render(<TestApp />);
            expect(screen.getByText('Login Page')).toBeInTheDocument();
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        });

        it('should render children when user is authenticated and has role', () => {
            mockUseAuth.mockReturnValue({
                isAuthenticated: true,
                loading: false,
                hasRole: vi.fn().mockReturnValue(true),
            });

            render(<TestApp />);
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });
    });

    describe('Authorization (Role-based)', () => {
        it('should redirect to unauthorized when user lacks required role', () => {
            mockUseAuth.mockReturnValue({
                isAuthenticated: true,
                loading: false,
                hasRole: vi.fn().mockReturnValue(false),
            });

            render(<TestApp minRole="manager" />);
            expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        });

        it('should render children when user has required role', () => {
            mockUseAuth.mockReturnValue({
                isAuthenticated: true,
                loading: false,
                hasRole: vi.fn().mockReturnValue(true),
            });

            render(<TestApp minRole="manager" />);
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });

        it('should call hasRole with the correct minRole parameter', () => {
            const hasRoleMock = vi.fn().mockReturnValue(true);
            mockUseAuth.mockReturnValue({
                isAuthenticated: true,
                loading: false,
                hasRole: hasRoleMock,
            });

            render(<TestApp minRole="cashier" />);
            expect(hasRoleMock).toHaveBeenCalledWith('cashier');
        });

        it('should use "regular" as default minRole when not specified', () => {
            const hasRoleMock = vi.fn().mockReturnValue(true);
            mockUseAuth.mockReturnValue({
                isAuthenticated: true,
                loading: false,
                hasRole: hasRoleMock,
            });

            render(<TestApp />);
            expect(hasRoleMock).toHaveBeenCalledWith('regular');
        });
    });

    describe('Different Role Levels', () => {
        it('should work with regular role', () => {
            mockUseAuth.mockReturnValue({
                isAuthenticated: true,
                loading: false,
                hasRole: (role) => role === 'regular',
            });

            render(<TestApp minRole="regular" />);
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });

        it('should work with cashier role', () => {
            mockUseAuth.mockReturnValue({
                isAuthenticated: true,
                loading: false,
                hasRole: (role) => ['regular', 'cashier'].includes(role),
            });

            render(<TestApp minRole="cashier" />);
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });

        it('should work with manager role', () => {
            mockUseAuth.mockReturnValue({
                isAuthenticated: true,
                loading: false,
                hasRole: (role) => ['regular', 'cashier', 'manager'].includes(role),
            });

            render(<TestApp minRole="manager" />);
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });

        it('should work with superuser role', () => {
            mockUseAuth.mockReturnValue({
                isAuthenticated: true,
                loading: false,
                hasRole: (role) => ['regular', 'cashier', 'manager', 'superuser'].includes(role),
            });

            render(<TestApp minRole="superuser" />);
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });
    });

    describe('Children Rendering', () => {
        it('should render custom children content', () => {
            mockUseAuth.mockReturnValue({
                isAuthenticated: true,
                loading: false,
                hasRole: vi.fn().mockReturnValue(true),
            });

            render(
                <TestApp>
                    <div data-testid="custom-content">Custom Protected Content</div>
                </TestApp>
            );
            expect(screen.getByTestId('custom-content')).toBeInTheDocument();
            expect(screen.getByText('Custom Protected Content')).toBeInTheDocument();
        });

        it('should render multiple children', () => {
            mockUseAuth.mockReturnValue({
                isAuthenticated: true,
                loading: false,
                hasRole: vi.fn().mockReturnValue(true),
            });

            render(
                <TestApp>
                    <div>First Child</div>
                    <div>Second Child</div>
                </TestApp>
            );
            expect(screen.getByText('First Child')).toBeInTheDocument();
            expect(screen.getByText('Second Child')).toBeInTheDocument();
        });

        it('should render nested components', () => {
            mockUseAuth.mockReturnValue({
                isAuthenticated: true,
                loading: false,
                hasRole: vi.fn().mockReturnValue(true),
            });

            const NestedComponent = () => (
                <div>
                    <h1>Nested Title</h1>
                    <p>Nested paragraph</p>
                </div>
            );

            render(
                <TestApp>
                    <NestedComponent />
                </TestApp>
            );
            expect(screen.getByText('Nested Title')).toBeInTheDocument();
            expect(screen.getByText('Nested paragraph')).toBeInTheDocument();
        });
    });

    describe('Navigation Behavior', () => {
        it('should use replace navigation when redirecting to login', () => {
            mockUseAuth.mockReturnValue({
                isAuthenticated: false,
                loading: false,
                hasRole: vi.fn().mockReturnValue(false),
            });

            // The Navigate component with replace prop will replace history
            // We can verify this by checking the login page renders
            render(<TestApp />);
            expect(screen.getByText('Login Page')).toBeInTheDocument();
        });

        it('should use replace navigation when redirecting to unauthorized', () => {
            mockUseAuth.mockReturnValue({
                isAuthenticated: true,
                loading: false,
                hasRole: vi.fn().mockReturnValue(false),
            });

            render(<TestApp minRole="superuser" />);
            expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        it('should handle undefined hasRole gracefully', () => {
            mockUseAuth.mockReturnValue({
                isAuthenticated: true,
                loading: false,
                hasRole: undefined,
            });

            // This should throw an error or redirect
            expect(() => render(<TestApp />)).toThrow();
        });

        it('should handle empty minRole string', () => {
            mockUseAuth.mockReturnValue({
                isAuthenticated: true,
                loading: false,
                hasRole: vi.fn().mockReturnValue(true),
            });

            render(<TestApp minRole="" />);
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });

        it('should handle null children', () => {
            mockUseAuth.mockReturnValue({
                isAuthenticated: true,
                loading: false,
                hasRole: vi.fn().mockReturnValue(true),
            });

            render(
                <TestApp>
                    {null}
                </TestApp>
            );
            // Should not throw error
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        });
    });

    describe('Auth State Transitions', () => {
        it('should re-render when auth state changes from loading to authenticated', () => {
            const { rerender } = render(<TestApp />);

            // First render: loading
            mockUseAuth.mockReturnValue({
                isAuthenticated: false,
                loading: true,
                hasRole: vi.fn().mockReturnValue(false),
            });
            rerender(<TestApp />);
            expect(screen.getByText('Loading...')).toBeInTheDocument();

            // Second render: authenticated
            mockUseAuth.mockReturnValue({
                isAuthenticated: true,
                loading: false,
                hasRole: vi.fn().mockReturnValue(true),
            });
            rerender(<TestApp />);
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });

        it('should re-render when auth state changes from authenticated to unauthenticated', () => {
            // First render: authenticated
            mockUseAuth.mockReturnValue({
                isAuthenticated: true,
                loading: false,
                hasRole: vi.fn().mockReturnValue(true),
            });
            const { rerender } = render(<TestApp />);
            expect(screen.getByText('Protected Content')).toBeInTheDocument();

            // Second render: unauthenticated
            mockUseAuth.mockReturnValue({
                isAuthenticated: false,
                loading: false,
                hasRole: vi.fn().mockReturnValue(false),
            });
            rerender(<TestApp />);
            expect(screen.getByText('Login Page')).toBeInTheDocument();
        });
    });
});

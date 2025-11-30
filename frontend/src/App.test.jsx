import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the AuthContext
vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => <div>{children}</div>,
  useAuth: () => ({
    user: null,
    token: null,
    loading: false,
    isAuthenticated: false,
    hasRole: vi.fn().mockReturnValue(false),
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    switchRole: vi.fn(),
    activeRole: 'regular',
    availableRoles: ['regular'],
  }),
}));

// Mock the ToastContext
vi.mock('./components/shared/ToastContext', () => ({
  ToastProvider: ({ children }) => <div>{children}</div>,
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<App />);
    // App should render, even if redirected to login
    expect(document.body).toBeDefined();
  });

  it('should have the App class on the main container', () => {
    const { container } = render(<App />);
    expect(container.querySelector('.App')).toBeInTheDocument();
  });
});

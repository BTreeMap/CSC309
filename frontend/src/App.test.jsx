import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
  Trans: ({ children }) => children,
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
}));

// Mock the i18n config with all exports
vi.mock('./i18n', () => ({
  SUPPORTED_LANGUAGES: {
    en: { name: 'English', nativeName: 'English', dir: 'ltr' },
    ar: { name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
    zh: { name: 'Chinese', nativeName: '中文', dir: 'ltr' },
    fr: { name: 'French', nativeName: 'Français', dir: 'ltr' },
    ru: { name: 'Russian', nativeName: 'Русский', dir: 'ltr' },
    es: { name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  },
  DEFAULT_LANGUAGE: 'en',
  FALLBACK_LANGUAGE: 'en',
  changeLanguage: vi.fn(),
  getCurrentDirection: () => 'ltr',
}));

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

  it('should have the App class on the main container', async () => {
    const { container } = render(<App />);
    await waitFor(() => {
      expect(container.querySelector('.App')).toBeInTheDocument();
    });
  });
});

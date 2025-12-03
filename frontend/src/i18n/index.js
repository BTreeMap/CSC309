import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

// Supported languages configuration - UN Official Languages
export const SUPPORTED_LANGUAGES = {
    en: { name: 'English', nativeName: 'English', dir: 'ltr' },
    ar: { name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
    zh: { name: 'Chinese', nativeName: '中文', dir: 'ltr' },
    fr: { name: 'French', nativeName: 'Français', dir: 'ltr' },
    ru: { name: 'Russian', nativeName: 'Русский', dir: 'ltr' },
    es: { name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
};

export const DEFAULT_LANGUAGE = 'en';
export const FALLBACK_LANGUAGE = 'en';

// Namespace configuration - organized by feature/domain
export const NAMESPACES = {
    common: 'common',       // Shared UI elements, buttons, labels
    auth: 'auth',           // Login, logout, password reset
    dashboard: 'dashboard', // Dashboard-specific strings
    nav: 'nav',             // Navigation and sidebar
    users: 'users',         // User management
    transactions: 'transactions', // Transaction-related strings
    promotions: 'promotions',     // Promotions and events
    errors: 'errors',       // Error messages
    validation: 'validation', // Form validation messages
};

export const DEFAULT_NAMESPACE = 'common';

i18n
    // Load translations via HTTP (from public/locales)
    .use(HttpBackend)
    // Detect user language from browser settings, URL, localStorage, etc.
    .use(LanguageDetector)
    // Pass i18n instance to react-i18next
    .use(initReactI18next)
    .init({
        // Fallback language when translation is missing
        fallbackLng: FALLBACK_LANGUAGE,

        // Supported languages
        supportedLngs: Object.keys(SUPPORTED_LANGUAGES),

        // Default namespace
        defaultNS: DEFAULT_NAMESPACE,

        // Namespaces to load by default
        ns: [DEFAULT_NAMESPACE],

        // Language detection options
        detection: {
            // Order of detection methods
            order: ['localStorage', 'navigator', 'htmlTag'],
            // Cache language preference in localStorage
            caches: ['localStorage'],
            // Key for localStorage
            lookupLocalStorage: 'i18nextLng',
        },

        // Backend options for loading translations
        backend: {
            // Path to translation files
            loadPath: '/locales/{{lng}}/{{ns}}.json',
        },

        // React-specific options
        react: {
            // Use Suspense for async loading
            useSuspense: true,
        },

        // Interpolation options
        interpolation: {
            // React already escapes values
            escapeValue: false,
            // Format function for dates, numbers, etc.
            format: (value, format, lng) => {
                if (value instanceof Date) {
                    return new Intl.DateTimeFormat(lng, getDateFormatOptions(format)).format(value);
                }
                if (typeof value === 'number') {
                    return new Intl.NumberFormat(lng, getNumberFormatOptions(format)).format(value);
                }
                return value;
            },
        },

        // Debug mode (disable in production)
        debug: import.meta.env.DEV,

        // Load all namespaces initially for better UX (can be changed to lazy load)
        partialBundledLanguages: true,
    });

// Helper function to get date format options
function getDateFormatOptions(format) {
    const formats = {
        short: { dateStyle: 'short' },
        medium: { dateStyle: 'medium' },
        long: { dateStyle: 'long' },
        full: { dateStyle: 'full' },
        time: { timeStyle: 'short' },
        datetime: { dateStyle: 'medium', timeStyle: 'short' },
    };
    return formats[format] || formats.medium;
}

// Helper function to get number format options
function getNumberFormatOptions(format) {
    const formats = {
        currency: { style: 'currency', currency: 'USD' },
        percent: { style: 'percent' },
        decimal: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        integer: { maximumFractionDigits: 0 },
    };
    return formats[format] || {};
}

// Helper to get current language direction
export const getCurrentDirection = () => {
    const lang = i18n.language || DEFAULT_LANGUAGE;
    const langCode = lang.split('-')[0]; // Handle variants like en-US
    return SUPPORTED_LANGUAGES[langCode]?.dir || 'ltr';
};

// Helper to change language and update document direction
export const changeLanguage = async (lng) => {
    await i18n.changeLanguage(lng);
    const langCode = lng.split('-')[0];
    const dir = SUPPORTED_LANGUAGES[langCode]?.dir || 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = lng;
};

export default i18n;

import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, getCurrentDirection, changeLanguage } from '../i18n';

/**
 * Custom hook for i18n functionality with enhanced features
 * Provides translation functions, language switching, and RTL support
 */
export const useLocale = () => {
    const { t, i18n } = useTranslation();

    const currentLanguage = i18n.language?.split('-')[0] || 'en';
    const currentLanguageInfo = SUPPORTED_LANGUAGES[currentLanguage] || SUPPORTED_LANGUAGES.en;
    const direction = currentLanguageInfo.dir || 'ltr';
    const isRTL = direction === 'rtl';

    // Update document direction when language changes
    useEffect(() => {
        document.documentElement.dir = direction;
        document.documentElement.lang = currentLanguage;
    }, [currentLanguage, direction]);

    // Language switcher function
    const setLanguage = useCallback(async (lng) => {
        await changeLanguage(lng);
    }, []);

    // Format date using Intl.DateTimeFormat
    const formatDate = useCallback((date, options = {}) => {
        if (!date) return '';
        const dateObj = date instanceof Date ? date : new Date(date);
        const defaultOptions = { dateStyle: 'medium' };
        return new Intl.DateTimeFormat(i18n.language, { ...defaultOptions, ...options }).format(dateObj);
    }, [i18n.language]);

    // Format time using Intl.DateTimeFormat
    const formatTime = useCallback((date, options = {}) => {
        if (!date) return '';
        const dateObj = date instanceof Date ? date : new Date(date);
        const defaultOptions = { timeStyle: 'short' };
        return new Intl.DateTimeFormat(i18n.language, { ...defaultOptions, ...options }).format(dateObj);
    }, [i18n.language]);

    // Format date and time
    const formatDateTime = useCallback((date, options = {}) => {
        if (!date) return '';
        const dateObj = date instanceof Date ? date : new Date(date);
        const defaultOptions = { dateStyle: 'medium', timeStyle: 'short' };
        return new Intl.DateTimeFormat(i18n.language, { ...defaultOptions, ...options }).format(dateObj);
    }, [i18n.language]);

    // Format number using Intl.NumberFormat
    const formatNumber = useCallback((number, options = {}) => {
        if (number == null) return '';
        return new Intl.NumberFormat(i18n.language, options).format(number);
    }, [i18n.language]);

    // Format currency using Intl.NumberFormat
    const formatCurrency = useCallback((amount, currency = 'USD', options = {}) => {
        if (amount == null) return '';
        return new Intl.NumberFormat(i18n.language, {
            style: 'currency',
            currency,
            ...options,
        }).format(amount);
    }, [i18n.language]);

    // Format relative time (e.g., "2 hours ago")
    const formatRelativeTime = useCallback((date) => {
        if (!date) return '';
        const dateObj = date instanceof Date ? date : new Date(date);
        const now = new Date();
        const diffMs = now - dateObj;
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' });

        if (diffDays > 0) return rtf.format(-diffDays, 'day');
        if (diffHours > 0) return rtf.format(-diffHours, 'hour');
        if (diffMinutes > 0) return rtf.format(-diffMinutes, 'minute');
        return rtf.format(-diffSeconds, 'second');
    }, [i18n.language]);

    return {
        // Translation function
        t,
        // i18n instance
        i18n,
        // Current language code
        currentLanguage,
        // Current language info (name, nativeName, dir)
        currentLanguageInfo,
        // Text direction
        direction,
        // Is RTL language
        isRTL,
        // Supported languages
        supportedLanguages: SUPPORTED_LANGUAGES,
        // Change language
        setLanguage,
        // Formatting functions
        formatDate,
        formatTime,
        formatDateTime,
        formatNumber,
        formatCurrency,
        formatRelativeTime,
    };
};

export default useLocale;

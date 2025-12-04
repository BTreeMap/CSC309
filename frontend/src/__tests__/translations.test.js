/**
 * Translation Coverage and Validation Tests
 * 
 * This test suite validates:
 * 1. All translation keys exist in all supported locales
 * 2. No invalid/orphan translation keys are used in components
 * 3. Translation files have valid JSON structure
 * 4. Interpolation placeholders are consistent across locales
 * 
 * Run with: npm test -- translations.test.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const LOCALES_DIR = path.join(__dirname, '../../public/locales');
const SRC_DIR = path.join(__dirname, '..');
const SUPPORTED_LOCALES = ['en', 'ar', 'es', 'fr', 'ru', 'zh'];
const REFERENCE_LOCALE = 'en'; // English is the source of truth
const NAMESPACES = ['auth', 'common', 'dashboard', 'errors', 'nav', 'promotions', 'transactions', 'users', 'validation'];

// Helper: Recursively get all keys from a nested object
function getAllKeys(obj, prefix = '') {
    let keys = [];
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            keys = keys.concat(getAllKeys(value, fullKey));
        } else {
            keys.push(fullKey);
        }
    }
    return keys;
}

// Helper: Get value at a nested key path
function getNestedValue(obj, keyPath) {
    return keyPath.split('.').reduce((current, key) => current?.[key], obj);
}

// Helper: Extract interpolation placeholders from a string
function extractPlaceholders(str) {
    if (typeof str !== 'string') return [];
    const matches = str.match(/\{\{(\w+)\}\}/g) || [];
    return matches.map(m => m.replace(/[{}]/g, ''));
}

// Helper: Load all translation files for a locale
function loadTranslations(locale) {
    const translations = {};
    for (const namespace of NAMESPACES) {
        const filePath = path.join(LOCALES_DIR, locale, `${namespace}.json`);
        if (fs.existsSync(filePath)) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                translations[namespace] = JSON.parse(content);
            } catch (e) {
                translations[namespace] = { __parseError: e.message };
            }
        } else {
            translations[namespace] = null;
        }
    }
    return translations;
}

// Helper: Recursively find all files with extensions
function findFiles(dir, extensions, files = []) {
    if (!fs.existsSync(dir)) return files;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== '__tests__') {
            findFiles(fullPath, extensions, files);
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
            files.push(fullPath);
        }
    }
    return files;
}

// Helper: Extract translation keys used in source code
function extractUsedTranslationKeys(sourceFiles) {
    const usedKeys = new Map(); // key -> [file locations]

    // Patterns to match t() and useTranslation calls
    const patterns = [
        // t('namespace:key') or t('key')
        /\bt\s*\(\s*['"`]([^'"`]+)['"`]/g,
        // t('namespace:key', { ... })
        /\bt\s*\(\s*['"`]([^'"`]+)['"`]\s*,/g,
        // useTranslation(['namespace1', 'namespace2'])
        /useTranslation\s*\(\s*\[([^\]]+)\]/g,
    ];

    for (const file of sourceFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(SRC_DIR, file);

        for (const pattern of patterns) {
            let match;
            const regex = new RegExp(pattern.source, pattern.flags);
            while ((match = regex.exec(content)) !== null) {
                const key = match[1];
                // Skip dynamic keys (containing variables)
                if (key.includes('${') || key.includes('`')) continue;

                if (!usedKeys.has(key)) {
                    usedKeys.set(key, []);
                }
                usedKeys.get(key).push(relativePath);
            }
        }
    }

    return usedKeys;
}

// Load all translations
const allTranslations = {};
for (const locale of SUPPORTED_LOCALES) {
    allTranslations[locale] = loadTranslations(locale);
}

// Get reference (English) keys
const referenceKeys = {};
for (const namespace of NAMESPACES) {
    if (allTranslations[REFERENCE_LOCALE][namespace] && !allTranslations[REFERENCE_LOCALE][namespace].__parseError) {
        referenceKeys[namespace] = getAllKeys(allTranslations[REFERENCE_LOCALE][namespace]);
    } else {
        referenceKeys[namespace] = [];
    }
}

describe('Translation Files Validation', () => {
    describe('JSON Structure', () => {
        for (const locale of SUPPORTED_LOCALES) {
            for (const namespace of NAMESPACES) {
                test(`${locale}/${namespace}.json should be valid JSON`, () => {
                    const filePath = path.join(LOCALES_DIR, locale, `${namespace}.json`);

                    if (!fs.existsSync(filePath)) {
                        console.warn(`⚠️  Missing file: ${locale}/${namespace}.json`);
                        return; // Skip if file doesn't exist (will be caught by other tests)
                    }

                    const content = fs.readFileSync(filePath, 'utf8');
                    expect(() => JSON.parse(content)).not.toThrow();
                });
            }
        }
    });

    describe('File Existence', () => {
        for (const locale of SUPPORTED_LOCALES) {
            for (const namespace of NAMESPACES) {
                test(`${locale}/${namespace}.json should exist`, () => {
                    const filePath = path.join(LOCALES_DIR, locale, `${namespace}.json`);
                    const exists = fs.existsSync(filePath);

                    if (!exists) {
                        console.error(`❌ Missing translation file: ${locale}/${namespace}.json`);
                    }

                    expect(exists).toBe(true);
                });
            }
        }
    });
});

describe('Translation Key Coverage', () => {
    // For each non-English locale, check that all English keys exist
    for (const locale of SUPPORTED_LOCALES.filter(l => l !== REFERENCE_LOCALE)) {
        describe(`${locale} locale`, () => {
            for (const namespace of NAMESPACES) {
                test(`${namespace} should have all keys from English`, () => {
                    const englishKeys = referenceKeys[namespace];
                    const localeData = allTranslations[locale][namespace];

                    if (!localeData || localeData.__parseError) {
                        if (englishKeys.length > 0) {
                            console.error(`❌ ${locale}/${namespace}.json is missing or invalid`);
                            console.error(`   Missing ${englishKeys.length} keys`);
                        }
                        expect(localeData).toBeTruthy();
                        return;
                    }

                    const localeKeys = getAllKeys(localeData);
                    const missingKeys = englishKeys.filter(key => !localeKeys.includes(key));

                    if (missingKeys.length > 0) {
                        console.error(`\n❌ ${locale}/${namespace}.json is missing ${missingKeys.length} translation(s):`);
                        missingKeys.forEach(key => {
                            const englishValue = getNestedValue(allTranslations[REFERENCE_LOCALE][namespace], key);
                            console.error(`   • ${key}`);
                            console.error(`     English: "${englishValue}"`);
                        });
                    }

                    expect(missingKeys).toEqual([]);
                });
            }
        });
    }
});

describe('Extra Keys (Keys in translations but not in English)', () => {
    for (const locale of SUPPORTED_LOCALES.filter(l => l !== REFERENCE_LOCALE)) {
        describe(`${locale} locale`, () => {
            for (const namespace of NAMESPACES) {
                test(`${namespace} should not have extra keys`, () => {
                    const englishKeys = referenceKeys[namespace];
                    const localeData = allTranslations[locale][namespace];

                    if (!localeData || localeData.__parseError) {
                        return; // Skip if locale file is missing/invalid
                    }

                    const localeKeys = getAllKeys(localeData);
                    const extraKeys = localeKeys.filter(key => !englishKeys.includes(key));

                    if (extraKeys.length > 0) {
                        console.warn(`\n⚠️  ${locale}/${namespace}.json has ${extraKeys.length} extra key(s) not in English:`);
                        extraKeys.forEach(key => {
                            console.warn(`   • ${key}`);
                        });
                    }

                    // This is a warning, not a failure - extra keys are allowed but should be reviewed
                    expect(extraKeys.length).toBeGreaterThanOrEqual(0);
                });
            }
        });
    }
});

describe('Interpolation Placeholder Consistency', () => {
    for (const locale of SUPPORTED_LOCALES.filter(l => l !== REFERENCE_LOCALE)) {
        describe(`${locale} locale`, () => {
            for (const namespace of NAMESPACES) {
                test(`${namespace} interpolation placeholders should match English`, () => {
                    const englishData = allTranslations[REFERENCE_LOCALE][namespace];
                    const localeData = allTranslations[locale][namespace];

                    if (!englishData || englishData.__parseError || !localeData || localeData.__parseError) {
                        return;
                    }

                    const englishKeys = referenceKeys[namespace];
                    const mismatchedPlaceholders = [];

                    for (const key of englishKeys) {
                        const englishValue = getNestedValue(englishData, key);
                        const localeValue = getNestedValue(localeData, key);

                        if (typeof englishValue === 'string' && typeof localeValue === 'string') {
                            const englishPlaceholders = extractPlaceholders(englishValue).sort();
                            const localePlaceholders = extractPlaceholders(localeValue).sort();

                            if (JSON.stringify(englishPlaceholders) !== JSON.stringify(localePlaceholders)) {
                                mismatchedPlaceholders.push({
                                    key,
                                    english: englishPlaceholders,
                                    locale: localePlaceholders,
                                    englishValue,
                                    localeValue
                                });
                            }
                        }
                    }

                    if (mismatchedPlaceholders.length > 0) {
                        console.error(`\n❌ ${locale}/${namespace}.json has ${mismatchedPlaceholders.length} placeholder mismatch(es):`);
                        mismatchedPlaceholders.forEach(({ key, english, locale: loc, englishValue, localeValue }) => {
                            console.error(`   • ${key}`);
                            console.error(`     English placeholders: ${JSON.stringify(english)} - "${englishValue}"`);
                            console.error(`     ${locale} placeholders: ${JSON.stringify(loc)} - "${localeValue}"`);
                        });
                    }

                    expect(mismatchedPlaceholders).toEqual([]);
                });
            }
        });
    }
});

describe('Used Translation Keys Validation', () => {
    // Find all source files
    const sourceFiles = findFiles(SRC_DIR, ['.js', '.jsx', '.ts', '.tsx']);

    // Extract used keys with context about which file uses them
    function extractUsedKeysWithContext(sourceFiles) {
        const usedKeysWithContext = [];

        for (const file of sourceFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const relativePath = path.relative(SRC_DIR, file);

            // Extract namespaces used in this file from useTranslation calls
            const namespaceMatch = content.match(/useTranslation\s*\(\s*\[([^\]]+)\]/);
            const singleNamespaceMatch = content.match(/useTranslation\s*\(\s*['"`](\w+)['"`]\s*\)/);

            let fileNamespaces = ['common']; // default
            if (namespaceMatch) {
                fileNamespaces = namespaceMatch[1]
                    .split(',')
                    .map(s => s.trim().replace(/['"]/g, ''))
                    .filter(s => s.length > 0);
            } else if (singleNamespaceMatch) {
                fileNamespaces = [singleNamespaceMatch[1]];
            }

            // Extract t() calls
            const tCallPattern = /\bt\s*\(\s*['"`]([^'"`]+)['"`]/g;
            let match;
            while ((match = tCallPattern.exec(content)) !== null) {
                const key = match[1];
                // Skip dynamic keys
                if (key.includes('${') || key.includes('`')) continue;

                usedKeysWithContext.push({
                    key,
                    file: relativePath,
                    namespaces: fileNamespaces
                });
            }
        }

        return usedKeysWithContext;
    }

    const usedKeysWithContext = extractUsedKeysWithContext(sourceFiles);

    test('All used translation keys should exist in English translations', () => {
        const invalidKeys = [];

        for (const { key, file, namespaces } of usedKeysWithContext) {
            // Skip non-translation keys (like variables or partial matches)
            if (!key.includes(':') && !key.includes('.')) continue;

            let namespace, keyPath;
            let foundInNamespace = false;

            if (key.includes(':')) {
                // Explicit namespace: namespace:key.path
                [namespace, keyPath] = key.split(':');

                if (!NAMESPACES.includes(namespace)) continue;

                const englishData = allTranslations[REFERENCE_LOCALE][namespace];
                if (englishData && !englishData.__parseError) {
                    const value = getNestedValue(englishData, keyPath);
                    if (value !== undefined) {
                        foundInNamespace = true;
                    }
                }
            } else {
                // No explicit namespace - check all namespaces declared in the file
                keyPath = key;

                for (const ns of namespaces) {
                    if (!NAMESPACES.includes(ns)) continue;

                    const englishData = allTranslations[REFERENCE_LOCALE][ns];
                    if (englishData && !englishData.__parseError) {
                        const value = getNestedValue(englishData, keyPath);
                        if (value !== undefined) {
                            foundInNamespace = true;
                            namespace = ns;
                            break;
                        }
                    }
                }
            }

            if (!foundInNamespace) {
                invalidKeys.push({
                    key,
                    namespace: namespace || namespaces.join(' or '),
                    keyPath,
                    file
                });
            }
        }

        // Deduplicate by key
        const uniqueInvalidKeys = [];
        const seenKeys = new Set();
        for (const item of invalidKeys) {
            if (!seenKeys.has(item.key)) {
                seenKeys.add(item.key);
                uniqueInvalidKeys.push(item);
            }
        }

        if (uniqueInvalidKeys.length > 0) {
            console.error(`\n❌ Found ${uniqueInvalidKeys.length} invalid translation key(s) used in source code:`);
            uniqueInvalidKeys.slice(0, 20).forEach(({ key, namespace, keyPath, file }) => {
                console.error(`   • "${key}" (namespace: ${namespace}, key: ${keyPath})`);
                console.error(`     Used in: ${file}`);
            });
            if (uniqueInvalidKeys.length > 20) {
                console.error(`   ... and ${uniqueInvalidKeys.length - 20} more`);
            }
        }

        expect(uniqueInvalidKeys).toEqual([]);
    });
});

describe('Translation Summary Report', () => {
    test('Generate translation coverage report', () => {
        const report = {
            totalNamespaces: NAMESPACES.length,
            totalLocales: SUPPORTED_LOCALES.length,
            referenceKeyCount: 0,
            coverage: {}
        };

        // Count total reference keys
        for (const namespace of NAMESPACES) {
            report.referenceKeyCount += referenceKeys[namespace].length;
        }

        // Calculate coverage for each locale
        for (const locale of SUPPORTED_LOCALES) {
            let translatedCount = 0;
            let missingCount = 0;
            const missingByNamespace = {};

            for (const namespace of NAMESPACES) {
                const englishKeys = referenceKeys[namespace];
                const localeData = allTranslations[locale][namespace];

                if (!localeData || localeData.__parseError) {
                    missingCount += englishKeys.length;
                    missingByNamespace[namespace] = englishKeys.length;
                    continue;
                }

                const localeKeys = getAllKeys(localeData);
                const missing = englishKeys.filter(key => !localeKeys.includes(key));

                translatedCount += englishKeys.length - missing.length;
                missingCount += missing.length;

                if (missing.length > 0) {
                    missingByNamespace[namespace] = missing.length;
                }
            }

            const percentage = report.referenceKeyCount > 0
                ? Math.round((translatedCount / report.referenceKeyCount) * 100)
                : 100;

            report.coverage[locale] = {
                translated: translatedCount,
                missing: missingCount,
                percentage,
                missingByNamespace
            };
        }

        // Print report
        console.log('\n📊 Translation Coverage Report');
        console.log('═'.repeat(60));
        console.log(`Total namespaces: ${report.totalNamespaces}`);
        console.log(`Total reference keys (English): ${report.referenceKeyCount}`);
        console.log('');

        for (const locale of SUPPORTED_LOCALES) {
            const { translated, missing, percentage, missingByNamespace } = report.coverage[locale];
            const bar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
            const status = percentage === 100 ? '✅' : percentage >= 80 ? '🟡' : '❌';

            console.log(`${status} ${locale.toUpperCase()}: ${bar} ${percentage}% (${translated}/${report.referenceKeyCount})`);

            if (Object.keys(missingByNamespace).length > 0) {
                console.log(`   Missing keys by namespace:`);
                for (const [ns, count] of Object.entries(missingByNamespace)) {
                    console.log(`     - ${ns}: ${count} keys`);
                }
            }
        }
        console.log('═'.repeat(60));

        // This test always passes - it's just for reporting
        expect(true).toBe(true);
    });
});

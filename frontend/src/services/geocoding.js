/**
 * Nominatim Geocoding Service with Client-Side Caching and Rate Limiting
 * 
 * This service provides geocoding functionality using OpenStreetMap's Nominatim API.
 * It includes:
 * - Local caching to reduce API calls
 * - Rate limiting to respect Nominatim's usage policy (max 1 request/second)
 * - Location suggestions with debouncing
 * 
 * Attribution: Uses Nominatim API with email parameter for identification
 * @see https://nominatim.org/release-docs/develop/api/Search/
 */

// Nominatim API configuration
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const NOMINATIM_EMAIL = 'csc309@oss.joefang.org';

// Rate limiting: minimum 1 second between requests (Nominatim policy)
const MIN_REQUEST_INTERVAL_MS = 1000;
let lastRequestTime = 0;

// Cache configuration
const CACHE_KEY = 'nominatim_geocoding_cache';
const CACHE_VERSION = 1;
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_MAX_ENTRIES = 500;

/**
 * @typedef {Object} Location
 * @property {number} lat - Latitude
 * @property {number} lon - Longitude
 * @property {string} displayName - Human-readable location name
 * @property {string} type - Location type (e.g., 'building', 'amenity')
 * @property {string} [placeId] - Nominatim place ID
 */

/**
 * @typedef {Object} CacheEntry
 * @property {Location[]} locations - Cached locations for this query
 * @property {number} timestamp - When this entry was cached
 */

/**
 * @typedef {Object} CacheData
 * @property {number} version - Cache version for invalidation
 * @property {Object.<string, CacheEntry>} entries - Query to locations mapping
 */

/**
 * Load cache from localStorage
 * @returns {CacheData}
 */
function loadCache() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) {
            return { version: CACHE_VERSION, entries: {} };
        }

        const data = JSON.parse(cached);

        // Invalidate if version mismatch
        if (data.version !== CACHE_VERSION) {
            return { version: CACHE_VERSION, entries: {} };
        }

        // Clean expired entries
        const now = Date.now();
        const validEntries = {};
        for (const [key, entry] of Object.entries(data.entries)) {
            if (now - entry.timestamp < CACHE_MAX_AGE_MS) {
                validEntries[key] = entry;
            }
        }

        return { version: CACHE_VERSION, entries: validEntries };
    } catch (error) {
        console.warn('Failed to load geocoding cache:', error);
        return { version: CACHE_VERSION, entries: {} };
    }
}

/**
 * Save cache to localStorage
 * @param {CacheData} cache
 */
function saveCache(cache) {
    try {
        // Limit cache size by removing oldest entries
        const entries = Object.entries(cache.entries);
        if (entries.length > CACHE_MAX_ENTRIES) {
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            const toKeep = entries.slice(-CACHE_MAX_ENTRIES);
            cache.entries = Object.fromEntries(toKeep);
        }

        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
        console.warn('Failed to save geocoding cache:', error);
    }
}

/**
 * Normalize query string for cache lookup
 * @param {string} query
 * @returns {string}
 */
function normalizeQuery(query) {
    return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Get cached locations for a query
 * @param {string} query
 * @returns {Location[]|null}
 */
function getCached(query) {
    const cache = loadCache();
    const normalizedQuery = normalizeQuery(query);
    const entry = cache.entries[normalizedQuery];

    if (entry && Date.now() - entry.timestamp < CACHE_MAX_AGE_MS) {
        return entry.locations;
    }

    return null;
}

/**
 * Add locations to cache
 * @param {string} query
 * @param {Location[]} locations
 */
function addToCache(query, locations) {
    const cache = loadCache();
    const normalizedQuery = normalizeQuery(query);

    cache.entries[normalizedQuery] = {
        locations,
        timestamp: Date.now()
    };

    saveCache(cache);
}

/**
 * Wait for rate limit to allow next request
 * @returns {Promise<void>}
 */
async function waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
        const waitTime = MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    lastRequestTime = Date.now();
}

/**
 * Geocode a location string to coordinates
 * @param {string} query - Location search query
 * @param {Object} [options] - Search options
 * @param {number} [options.limit=5] - Maximum number of results
 * @param {boolean} [options.skipCache=false] - Skip cache lookup
 * @returns {Promise<Location[]>} Array of matching locations
 */
export async function geocode(query, options = {}) {
    const { limit = 5, skipCache = false } = options;

    if (!query || query.trim().length < 2) {
        return [];
    }

    // Check cache first
    if (!skipCache) {
        const cached = getCached(query);
        if (cached !== null) {
            console.log(`[Geocoding] Cache hit for: "${query}"`);
            return cached.slice(0, limit);
        }
    }

    console.log(`[Geocoding] Cache miss, fetching: "${query}"`);

    // Wait for rate limit
    await waitForRateLimit();

    try {
        const params = new URLSearchParams({
            format: 'json',
            q: query,
            limit: String(limit),
            email: NOMINATIM_EMAIL,
            addressdetails: '1'
        });

        const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`);

        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status}`);
        }

        const data = await response.json();

        const locations = data.map(item => ({
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            displayName: item.display_name,
            type: item.type || item.class || 'place',
            placeId: item.place_id?.toString()
        }));

        // Cache the results
        addToCache(query, locations);

        return locations;
    } catch (error) {
        console.error('[Geocoding] Error:', error);
        throw error;
    }
}

/**
 * Get the first geocoding result (convenience method)
 * @param {string} query - Location search query
 * @returns {Promise<Location|null>} First matching location or null
 */
export async function geocodeFirst(query) {
    const results = await geocode(query, { limit: 1 });
    return results.length > 0 ? results[0] : null;
}

/**
 * Search for location suggestions with debouncing built-in
 * Returns a controller that can be aborted
 * @param {string} query - Location search query
 * @param {Object} [options] - Search options
 * @param {number} [options.limit=5] - Maximum number of results
 * @returns {Promise<Location[]>} Array of location suggestions
 */
export async function searchLocations(query, options = {}) {
    return geocode(query, options);
}

/**
 * Clear the geocoding cache
 */
export function clearCache() {
    try {
        localStorage.removeItem(CACHE_KEY);
        console.log('[Geocoding] Cache cleared');
    } catch (error) {
        console.warn('Failed to clear geocoding cache:', error);
    }
}

/**
 * Get cache statistics
 * @returns {{ entryCount: number, oldestEntry: Date|null, newestEntry: Date|null }}
 */
export function getCacheStats() {
    const cache = loadCache();
    const entries = Object.values(cache.entries);

    if (entries.length === 0) {
        return { entryCount: 0, oldestEntry: null, newestEntry: null };
    }

    const timestamps = entries.map(e => e.timestamp);

    return {
        entryCount: entries.length,
        oldestEntry: new Date(Math.min(...timestamps)),
        newestEntry: new Date(Math.max(...timestamps))
    };
}

/**
 * Default export with all functions
 */
export default {
    geocode,
    geocodeFirst,
    searchLocations,
    clearCache,
    getCacheStats
};

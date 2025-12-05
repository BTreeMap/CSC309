/**
 * Nominatim Geocoding Service
 * 
 * A robust geocoding service using OpenStreetMap's Nominatim API with:
 * - IndexedDB caching (non-blocking, async storage)
 * - Proper rate limiting with request serialization
 * - SwitchMap pattern: cancels obsolete requests, prioritizes latest
 * - Debounced search for optimal UX
 * 
 * @see https://nominatim.org/release-docs/develop/api/Search/
 * @see https://operations.osmfoundation.org/policies/nominatim/
 */

// =============================================================================
// Configuration
// =============================================================================

const NOMINATIM_API_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_EMAIL = 'csc309@oss.joefang.org';

// Rate limit: Nominatim requires max 1 request/second
// We use 1100ms to be safe and account for network latency
const RATE_LIMIT_MS = 1100;

// Cache configuration
const CACHE_DB_NAME = 'geocoding-cache';
const CACHE_DB_VERSION = 1;
const CACHE_STORE_NAME = 'locations';
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_MAX_ENTRIES = 500;

// Search configuration
const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

// =============================================================================
// Types (JSDoc)
// =============================================================================

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
 * @property {string} query - Normalized query string (primary key)
 * @property {Location[]} locations - Cached locations
 * @property {number} timestamp - Cache entry creation time
 */

// =============================================================================
// IndexedDB Wrapper (Tiny, Promise-based)
// =============================================================================

class GeocodingCache {
    /** @type {IDBDatabase | null} */
    #db = null;

    /** @type {Promise<IDBDatabase> | null} */
    #dbPromise = null;

    /**
     * Open or get the IndexedDB database
     * @returns {Promise<IDBDatabase>}
     */
    async #getDB() {
        if (this.#db) return this.#db;
        if (this.#dbPromise) return this.#dbPromise;

        this.#dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = /** @type {IDBOpenDBRequest} */ (event.target).result;

                // Create object store with query as key path
                if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
                    const store = db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'query' });
                    // Index by timestamp for efficient cleanup
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.#db = /** @type {IDBOpenDBRequest} */ (event.target).result;
                resolve(this.#db);
            };

            request.onerror = (event) => {
                console.error('[GeocodingCache] Failed to open IndexedDB:', event);
                reject(new Error('Failed to open geocoding cache database'));
            };
        });

        return this.#dbPromise;
    }

    /**
     * Normalize query for consistent cache keys
     * @param {string} query
     * @returns {string}
     */
    #normalizeQuery(query) {
        return query.toLowerCase().trim().replace(/\s+/g, ' ');
    }

    /**
     * Get cached locations for a query
     * @param {string} query
     * @returns {Promise<Location[] | null>}
     */
    async get(query) {
        try {
            const db = await this.#getDB();
            const normalizedQuery = this.#normalizeQuery(query);

            return new Promise((resolve, reject) => {
                const transaction = db.transaction(CACHE_STORE_NAME, 'readonly');
                const store = transaction.objectStore(CACHE_STORE_NAME);
                const request = store.get(normalizedQuery);

                request.onsuccess = () => {
                    const entry = /** @type {CacheEntry | undefined} */ (request.result);

                    if (!entry) {
                        resolve(null);
                        return;
                    }

                    // Check if entry has expired
                    if (Date.now() - entry.timestamp > CACHE_MAX_AGE_MS) {
                        // Entry expired, delete it asynchronously
                        this.delete(normalizedQuery).catch(console.warn);
                        resolve(null);
                        return;
                    }

                    resolve(entry.locations);
                };

                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn('[GeocodingCache] Get failed:', error);
            return null;
        }
    }

    /**
     * Store locations in cache
     * @param {string} query
     * @param {Location[]} locations
     * @returns {Promise<void>}
     */
    async set(query, locations) {
        try {
            const db = await this.#getDB();
            const normalizedQuery = this.#normalizeQuery(query);

            /** @type {CacheEntry} */
            const entry = {
                query: normalizedQuery,
                locations,
                timestamp: Date.now()
            };

            return new Promise((resolve, reject) => {
                const transaction = db.transaction(CACHE_STORE_NAME, 'readwrite');
                const store = transaction.objectStore(CACHE_STORE_NAME);
                const request = store.put(entry);

                request.onsuccess = () => {
                    // Trigger cleanup in background (don't await)
                    this.#cleanup().catch(console.warn);
                    resolve();
                };

                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn('[GeocodingCache] Set failed:', error);
        }
    }

    /**
     * Delete a cache entry
     * @param {string} query
     * @returns {Promise<void>}
     */
    async delete(query) {
        try {
            const db = await this.#getDB();
            const normalizedQuery = this.#normalizeQuery(query);

            return new Promise((resolve, reject) => {
                const transaction = db.transaction(CACHE_STORE_NAME, 'readwrite');
                const store = transaction.objectStore(CACHE_STORE_NAME);
                const request = store.delete(normalizedQuery);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn('[GeocodingCache] Delete failed:', error);
        }
    }

    /**
     * Clear all cache entries
     * @returns {Promise<void>}
     */
    async clear() {
        try {
            const db = await this.#getDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction(CACHE_STORE_NAME, 'readwrite');
                const store = transaction.objectStore(CACHE_STORE_NAME);
                const request = store.clear();

                request.onsuccess = () => {
                    console.log('[GeocodingCache] Cache cleared');
                    resolve();
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn('[GeocodingCache] Clear failed:', error);
        }
    }

    /**
     * Get cache statistics
     * @returns {Promise<{ entryCount: number; oldestEntry: Date | null; newestEntry: Date | null }>}
     */
    async getStats() {
        try {
            const db = await this.#getDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction(CACHE_STORE_NAME, 'readonly');
                const store = transaction.objectStore(CACHE_STORE_NAME);
                const index = store.index('timestamp');

                let entryCount = 0;
                let oldestTimestamp = Infinity;
                let newestTimestamp = 0;

                const request = index.openCursor();

                request.onsuccess = (event) => {
                    const cursor = /** @type {IDBRequest<IDBCursorWithValue>} */ (event.target).result;

                    if (cursor) {
                        entryCount++;
                        const { timestamp } = cursor.value;
                        oldestTimestamp = Math.min(oldestTimestamp, timestamp);
                        newestTimestamp = Math.max(newestTimestamp, timestamp);
                        cursor.continue();
                    } else {
                        resolve({
                            entryCount,
                            oldestEntry: entryCount > 0 ? new Date(oldestTimestamp) : null,
                            newestEntry: entryCount > 0 ? new Date(newestTimestamp) : null
                        });
                    }
                };

                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn('[GeocodingCache] GetStats failed:', error);
            return { entryCount: 0, oldestEntry: null, newestEntry: null };
        }
    }

    /**
     * Cleanup old/excess entries (runs in background)
     * @returns {Promise<void>}
     */
    async #cleanup() {
        try {
            const db = await this.#getDB();
            const now = Date.now();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction(CACHE_STORE_NAME, 'readwrite');
                const store = transaction.objectStore(CACHE_STORE_NAME);
                const index = store.index('timestamp');

                /** @type {Array<{ key: string; timestamp: number }>} */
                const entries = [];
                let expiredCount = 0;

                const cursorRequest = index.openCursor();

                cursorRequest.onsuccess = (event) => {
                    const cursor = /** @type {IDBRequest<IDBCursorWithValue>} */ (event.target).result;

                    if (cursor) {
                        const { query, timestamp } = cursor.value;

                        // Delete expired entries immediately
                        if (now - timestamp > CACHE_MAX_AGE_MS) {
                            cursor.delete();
                            expiredCount++;
                        } else {
                            entries.push({ key: query, timestamp });
                        }
                        cursor.continue();
                    } else {
                        // After iterating, check if we need to prune for size
                        if (entries.length > CACHE_MAX_ENTRIES) {
                            // Sort by timestamp (oldest first)
                            entries.sort((a, b) => a.timestamp - b.timestamp);

                            // Delete oldest 20% to avoid frequent cleanups
                            const deleteCount = Math.floor(entries.length * 0.2);
                            const toDelete = entries.slice(0, deleteCount);

                            for (const { key } of toDelete) {
                                store.delete(key);
                            }

                            console.log(`[GeocodingCache] Pruned ${deleteCount} old entries`);
                        }

                        if (expiredCount > 0) {
                            console.log(`[GeocodingCache] Removed ${expiredCount} expired entries`);
                        }

                        resolve();
                    }
                };

                cursorRequest.onerror = () => reject(cursorRequest.error);
            });
        } catch (error) {
            console.warn('[GeocodingCache] Cleanup failed:', error);
        }
    }
}

// =============================================================================
// Geocoding Service (with rate limiting and request prioritization)
// =============================================================================

class GeocodingService {
    /** @type {GeocodingCache} */
    #cache = new GeocodingCache();

    /** @type {Promise<void>} */
    #requestQueue = Promise.resolve();

    /** @type {AbortController | null} */
    #currentAbortController = null;

    /** @type {number | null} */
    #debounceTimer = null;

    /**
     * Map Nominatim response to Location object
     * @param {Object} item - Nominatim response item
     * @returns {Location}
     */
    #mapResponseItem(item) {
        return {
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            displayName: item.display_name,
            type: item.type || item.class || 'place',
            placeId: item.place_id?.toString()
        };
    }

    /**
     * Build Nominatim search URL
     * @param {string} query
     * @param {number} limit
     * @returns {URL}
     */
    #buildSearchUrl(query, limit) {
        const url = new URL(NOMINATIM_API_URL);
        url.searchParams.set('format', 'json');
        url.searchParams.set('q', query);
        url.searchParams.set('limit', String(limit));
        url.searchParams.set('addressdetails', '1');
        url.searchParams.set('email', NOMINATIM_EMAIL);
        return url;
    }

    /**
     * Execute the actual network request with rate limiting
     * This is serialized through the request queue
     * @param {string} query
     * @param {number} limit
     * @param {AbortSignal} signal
     * @returns {Promise<Location[]>}
     */
    async #executeRequest(query, limit, signal) {
        const url = this.#buildSearchUrl(query, limit);

        console.log(`[Geocoding] Fetching: "${query}"`);

        const response = await fetch(url.href, { signal });

        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.map((item) => this.#mapResponseItem(item));
    }

    /**
     * Geocode a location with caching, rate limiting, and cancellation support
     * @param {string} query - Search query
     * @param {Object} [options]
     * @param {number} [options.limit=5] - Max results
     * @param {boolean} [options.skipCache=false] - Bypass cache
     * @param {AbortSignal} [options.signal] - External abort signal
     * @returns {Promise<Location[]>}
     */
    async geocode(query, options = {}) {
        const { limit = 5, skipCache = false, signal: externalSignal } = options;

        // Validate query
        if (!query || query.trim().length < MIN_QUERY_LENGTH) {
            return [];
        }

        const trimmedQuery = query.trim();

        // Check cache first (fast path, no rate limit needed)
        if (!skipCache) {
            const cached = await this.#cache.get(trimmedQuery);
            if (cached !== null) {
                console.log(`[Geocoding] Cache hit: "${trimmedQuery}"`);
                return cached.slice(0, limit);
            }
        }

        console.log(`[Geocoding] Cache miss: "${trimmedQuery}"`);

        // Cancel any in-flight request (SwitchMap behavior)
        if (this.#currentAbortController) {
            this.#currentAbortController.abort();
        }

        // Create new abort controller for this request
        this.#currentAbortController = new AbortController();
        const internalSignal = this.#currentAbortController.signal;

        // Combine with external signal if provided
        const combinedSignal = externalSignal
            ? this.#combineAbortSignals(internalSignal, externalSignal)
            : internalSignal;

        // Chain this request to the queue (ensures rate limiting)
        const result = this.#requestQueue.then(async () => {
            try {
                // Check if already aborted before making request
                if (combinedSignal.aborted) {
                    throw new DOMException('Aborted', 'AbortError');
                }

                const locations = await this.#executeRequest(trimmedQuery, limit, combinedSignal);

                // Cache the results
                await this.#cache.set(trimmedQuery, locations);

                return locations;
            } finally {
                // Always wait for rate limit before allowing next request
                await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS));

                // Clear abort controller if this was the current request
                if (this.#currentAbortController?.signal === internalSignal) {
                    this.#currentAbortController = null;
                }
            }
        });

        // Update queue tail (catch to prevent queue breakage on error)
        this.#requestQueue = result.catch(() => { });

        return result;
    }

    /**
     * Combine multiple abort signals into one
     * @param  {...AbortSignal} signals
     * @returns {AbortSignal}
     */
    #combineAbortSignals(...signals) {
        const controller = new AbortController();

        for (const signal of signals) {
            if (signal.aborted) {
                controller.abort();
                break;
            }
            signal.addEventListener('abort', () => controller.abort(), { once: true });
        }

        return controller.signal;
    }

    /**
     * Search with debouncing - ideal for typeahead/autocomplete
     * Cancels previous pending searches automatically
     * @param {string} query
     * @param {Object} [options]
     * @param {number} [options.limit=5]
     * @param {number} [options.debounceMs=SEARCH_DEBOUNCE_MS]
     * @returns {Promise<Location[]>}
     */
    search(query, options = {}) {
        const { limit = 5, debounceMs = SEARCH_DEBOUNCE_MS } = options;

        // Clear previous debounce timer
        if (this.#debounceTimer !== null) {
            clearTimeout(this.#debounceTimer);
            this.#debounceTimer = null;
        }

        // Return promise that resolves after debounce
        return new Promise((resolve, reject) => {
            this.#debounceTimer = window.setTimeout(async () => {
                try {
                    const results = await this.geocode(query, { limit });
                    resolve(results);
                } catch (error) {
                    // Don't reject on abort - just return empty
                    if (error.name === 'AbortError') {
                        resolve([]);
                    } else {
                        reject(error);
                    }
                }
            }, debounceMs);
        });
    }

    /**
     * Get first geocoding result (convenience method)
     * @param {string} query
     * @returns {Promise<Location | null>}
     */
    async geocodeFirst(query) {
        const results = await this.geocode(query, { limit: 1 });
        return results[0] ?? null;
    }

    /**
     * Clear the geocoding cache
     * @returns {Promise<void>}
     */
    async clearCache() {
        return this.#cache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Promise<{ entryCount: number; oldestEntry: Date | null; newestEntry: Date | null }>}
     */
    async getCacheStats() {
        return this.#cache.getStats();
    }
}

// =============================================================================
// Singleton Instance & Exports
// =============================================================================

const geocodingService = new GeocodingService();

/**
 * Geocode a location string to coordinates
 * @param {string} query - Location search query
 * @param {Object} [options] - Search options
 * @param {number} [options.limit=5] - Maximum number of results
 * @param {boolean} [options.skipCache=false] - Skip cache lookup
 * @param {AbortSignal} [options.signal] - Abort signal
 * @returns {Promise<Location[]>} Array of matching locations
 */
export async function geocode(query, options = {}) {
    return geocodingService.geocode(query, options);
}

/**
 * Get the first geocoding result (convenience method)
 * @param {string} query - Location search query
 * @returns {Promise<Location | null>} First matching location or null
 */
export async function geocodeFirst(query) {
    return geocodingService.geocodeFirst(query);
}

/**
 * Search for location suggestions with built-in debouncing
 * Automatically cancels previous searches and prioritizes latest
 * @param {string} query - Location search query
 * @param {Object} [options] - Search options
 * @param {number} [options.limit=5] - Maximum number of results
 * @param {number} [options.debounceMs=300] - Debounce delay in ms
 * @returns {Promise<Location[]>} Array of location suggestions
 */
export async function searchLocations(query, options = {}) {
    return geocodingService.search(query, options);
}

/**
 * Clear the geocoding cache
 * @returns {Promise<void>}
 */
export async function clearCache() {
    return geocodingService.clearCache();
}

/**
 * Get cache statistics
 * @returns {Promise<{ entryCount: number; oldestEntry: Date | null; newestEntry: Date | null }>}
 */
export async function getCacheStats() {
    return geocodingService.getCacheStats();
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

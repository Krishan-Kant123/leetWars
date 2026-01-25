/**
 * Simple in-memory cache with TTL (Time To Live)
 * Used to cache LeetCode API responses to reduce API calls
 */

class CacheManager {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Set a value in cache with TTL
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttlSeconds - Time to live in seconds (default: 2.5 hours)
     */
    set(key, value, ttlSeconds = 9000) { // 2.5 hours = 9000 seconds
        const expiresAt = Date.now() + (ttlSeconds * 1000);
        this.cache.set(key, {
            value,
            expiresAt
        });
    }

    /**
     * Get a value from cache
     * @param {string} key - Cache key
     * @returns {any|null} - Cached value or null if expired/not found
     */
    get(key) {
        const item = this.cache.get(key);
        
        if (!item) {
            return null;
        }

        // Check if expired
        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    /**
     * Check if a key exists and is not expired
     * @param {string} key - Cache key
     * @returns {boolean}
     */
    has(key) {
        return this.get(key) !== null;
    }

    /**
     * Delete a specific key from cache
     * @param {string} key - Cache key
     */
    delete(key) {
        this.cache.delete(key);
    }

    /**
     * Clear all cache
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} - Cache stats
     */
    getStats() {
        let activeCount = 0;
        let expiredCount = 0;

        for (const [key, item] of this.cache.entries()) {
            if (Date.now() > item.expiresAt) {
                expiredCount++;
            } else {
                activeCount++;
            }
        }

        return {
            total: this.cache.size,
            active: activeCount,
            expired: expiredCount
        };
    }

    /**
     * Clean up expired entries
     */
    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiresAt) {
                this.cache.delete(key);
            }
        }
    }
}

// Create a singleton instance
const cache = new CacheManager();

// Run cleanup every hour
setInterval(() => {
    cache.cleanup();
    console.log('Cache cleanup completed. Stats:', cache.getStats());
}, 3600000); // 1 hour

module.exports = cache;

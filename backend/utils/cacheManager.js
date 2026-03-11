/**
 * Caching utility for storing frequently accessed data in memory
 * Reduces database hits for static/semi-static data like categories, teams, and seasons
 */

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.ttls = new Map(); // Track TTL for each cache entry
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or null if expired/missing
   */
  get(key) {
    const value = this.cache.get(key);
    if (!value) return null;

    // Check if cache has expired
    const ttl = this.ttls.get(key);
    if (ttl && Date.now() > ttl) {
      this.cache.delete(key);
      this.ttls.delete(key);
      return null;
    }

    return value;
  }

  /**
   * Set a value in cache with optional TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlSeconds - Time to live in seconds (default: 3600 = 1 hour)
   */
  set(key, value, ttlSeconds = 3600) {
    this.cache.set(key, value);
    this.ttls.set(key, Date.now() + (ttlSeconds * 1000));
  }

  /**
   * Clear a specific cache entry
   * @param {string} key - Cache key to clear
   */
  clear(key) {
    this.cache.delete(key);
    this.ttls.delete(key);
  }

  /**
   * Clear all cache entries matching a pattern
   * @param {string} pattern - Regex pattern to match keys
   */
  clearPattern(pattern) {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        this.ttls.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clearAll() {
    this.cache.clear();
    this.ttls.clear();
  }

  /**
   * Get cache statistics (useful for monitoring)
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const cacheManager = new CacheManager();

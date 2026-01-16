/**
 * Simple in-memory cache service
 * In production, this should be replaced with Redis or similar
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 3600; // 1 hour in seconds

    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get cached value
   * @param {string} key - Cache key
   * @returns {any} Cached value or null if not found/expired
   */
  get(key) {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Set cached value
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   */
  set(key, value, ttl = this.defaultTTL) {
    const expiry = Date.now() + (ttl * 1000);
    this.cache.set(key, { value, expiry });
  }

  /**
   * Delete cached value
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cached values
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  stats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

module.exports = new CacheService();

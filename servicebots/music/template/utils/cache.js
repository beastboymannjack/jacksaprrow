class LRUCache {
    constructor(maxSize = 100, ttl = 3600000) {
        this.maxSize = maxSize;
        this.ttl = ttl;
        this.cache = new Map();
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        
        this.cache.delete(key);
        this.cache.set(key, item);
        return item.value;
    }

    set(key, value, customTtl = null) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            value,
            expiry: Date.now() + (customTtl || this.ttl)
        });
    }

    has(key) {
        return this.get(key) !== null;
    }

    delete(key) {
        return this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }

    size() {
        return this.cache.size;
    }
}

const trackCache = new LRUCache(200, 1800000);
const searchCache = new LRUCache(100, 600000);
const recommendationCache = new LRUCache(50, 900000);

module.exports = {
    LRUCache,
    trackCache,
    searchCache,
    recommendationCache
};

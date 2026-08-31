/**
 * High-Performance In-Memory Cache Middleware
 * Automatically caches GET requests for configured TTL (seconds)
 * Automatically purges cache keys on state-mutating requests (POST, PUT, PATCH, DELETE)
 */

const cacheStore = new Map();

const getCacheKey = (req) => {
  return `${req.method}:${req.baseUrl || ''}${req.path}:${JSON.stringify(req.query)}:${req.user?.id || 'anon'}`;
};

const cacheMiddleware = (ttlSeconds = 30) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = getCacheKey(req);
    const cached = cacheStore.get(key);

    if (cached && Date.now() < cached.expiry) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached.data);
    }

    // Capture res.json to store in cache
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheStore.set(key, {
          data: body,
          expiry: Date.now() + (ttlSeconds * 1000)
        });
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
};

const clearCachePrefix = (prefix) => {
  for (const key of cacheStore.keys()) {
    if (key.includes(prefix)) {
      cacheStore.delete(key);
    }
  }
};

const autoInvalidateCache = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    cacheStore.clear();
  }
  next();
};

module.exports = { cacheMiddleware, clearCachePrefix, autoInvalidateCache };

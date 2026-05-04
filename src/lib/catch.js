const stores = global.insightaCaches || { query: new Map() };
global.insightaCaches = stores;

export function getCache(key, storeName = "query") {
  const store = stores[storeName];
  const entry = store?.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }

  return entry.value;
}

export function setCache(key, value, options = {}) {
  const storeName = options.storeName || "query";
  const ttlMs = options.ttlMs || 60_000;
  const maxEntries = options.maxEntries || 500;

  if (!stores[storeName]) stores[storeName] = new Map();
  const store = stores[storeName];

  if (store.size >= maxEntries) {
    const firstKey = store.keys().next().value;
    if (firstKey) store.delete(firstKey);
  }

  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export function clearCache(storeName = "query") {
  stores[storeName]?.clear();
}

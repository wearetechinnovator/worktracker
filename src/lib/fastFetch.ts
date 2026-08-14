// In-memory cache for instant client-side rendering
const memoryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute default TTL

export async function fetchWithCache<T = any>(
  url: string,
  options?: RequestInit,
  onData?: (data: T) => void
): Promise<T> {
  const cacheKey = url;

  // 1. Check if cached data exists
  const cached = memoryCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    if (onData) {
      onData(cached.data);
    }
  }

  // 2. Fetch fresh data in background or foreground
  try {
    const res = await fetch(url, options);
    const json = await res.json();

    if (json.success !== false) {
      memoryCache.set(cacheKey, { data: json, timestamp: Date.now() });
      if (onData) {
        onData(json);
      }
    }
    return json;
  } catch (error) {
    if (cached) {
      return cached.data;
    }
    throw error;
  }
}

export function invalidateApiCache(urlPrefix?: string) {
  if (!urlPrefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.includes(urlPrefix)) {
      memoryCache.delete(key);
    }
  }
}

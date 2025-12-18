/**
 * Redis Cache Client
 * Provides caching utilities using Redis
 */

import { connection } from '../queue/redis.js';

// Cache key prefixes
const KEY_PREFIXES = {
  WALLET: 'wallet',
  USER: 'user',
  WALLET_BALANCE: 'wallet:balance',
  WALLET_PENDING: 'wallet:pending',
  USER_DATA: 'user:data',
};

/**
 * Generate cache key
 */
function getKey(prefix, ...parts) {
  return `${prefix}:${parts.join(':')}`;
}

/**
 * Get value from cache
 */
export async function get(key) {
  try {
    const value = await connection.get(key);
    if (!value) return null;
    return JSON.parse(value);
  } catch (error) {
    console.error(`[Cache] Error getting key ${key}:`, error);
    return null; // Fail gracefully - return null on cache errors
  }
}

/**
 * Set value in cache
 */
export async function set(key, value, ttlSeconds = null) {
  try {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await connection.setex(key, ttlSeconds, serialized);
    } else {
      await connection.set(key, serialized);
    }
    return true;
  } catch (error) {
    console.error(`[Cache] Error setting key ${key}:`, error);
    return false; // Fail gracefully - don't throw
  }
}

/**
 * Delete value from cache
 */
export async function del(key) {
  try {
    await connection.del(key);
    return true;
  } catch (error) {
    console.error(`[Cache] Error deleting key ${key}:`, error);
    return false;
  }
}

/**
 * Delete multiple keys matching pattern
 */
export async function delPattern(pattern) {
  try {
    const keys = await connection.keys(pattern);
    if (keys.length > 0) {
      await connection.del(...keys);
    }
    return keys.length;
  } catch (error) {
    console.error(`[Cache] Error deleting pattern ${pattern}:`, error);
    return 0;
  }
}

/**
 * Check if key exists
 */
export async function exists(key) {
  try {
    const result = await connection.exists(key);
    return result === 1;
  } catch (error) {
    console.error(`[Cache] Error checking key ${key}:`, error);
    return false;
  }
}

/**
 * Get or set with TTL (cache-aside pattern)
 */
export async function getOrSet(key, fetchFn, ttlSeconds = 300) {
  // Try cache first
  const cached = await get(key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch from source
  const value = await fetchFn();
  
  // Store in cache
  await set(key, value, ttlSeconds);
  
  return value;
}

/**
 * Invalidate cache for a key
 */
export async function invalidate(key) {
  return await del(key);
}

/**
 * Invalidate all cache for a user
 */
export async function invalidateUser(userId) {
  const patterns = [
    getKey(KEY_PREFIXES.WALLET, userId, '*'),
    getKey(KEY_PREFIXES.USER, userId, '*'),
    getKey(KEY_PREFIXES.WALLET_BALANCE, userId, '*'),
    getKey(KEY_PREFIXES.WALLET_PENDING, userId, '*'),
  ];
  
  let totalDeleted = 0;
  for (const pattern of patterns) {
    totalDeleted += await delPattern(pattern);
  }
  
  return totalDeleted;
}

/**
 * Invalidate wallet cache for a specific wallet
 */
export async function invalidateWallet(walletId, userId = null) {
  const patterns = [
    getKey(KEY_PREFIXES.WALLET, walletId, '*'),
    getKey(KEY_PREFIXES.WALLET_BALANCE, walletId, '*'),
    getKey(KEY_PREFIXES.WALLET_PENDING, walletId, '*'),
  ];
  
  // Also invalidate by user if provided
  if (userId) {
    patterns.push(
      getKey(KEY_PREFIXES.WALLET_BALANCE, userId, '*'),
      getKey(KEY_PREFIXES.WALLET_PENDING, userId, '*'),
    );
  }
  
  let totalDeleted = 0;
  for (const pattern of patterns) {
    totalDeleted += await delPattern(pattern);
  }
  
  return totalDeleted;
}

/**
 * Get cache statistics
 */
export async function getStats() {
  try {
    const info = await connection.info('stats');
    const keyspace = await connection.info('keyspace');
    
    // Parse info output
    const stats = {
      totalKeys: 0,
      hitRate: 0,
      missRate: 0,
    };
    
    // Count keys (approximate)
    const dbInfo = keyspace.match(/db\d+:keys=(\d+)/);
    if (dbInfo) {
      stats.totalKeys = parseInt(dbInfo[1], 10);
    }
    
    return stats;
  } catch (error) {
    console.error('[Cache] Error getting stats:', error);
    return { totalKeys: 0, hitRate: 0, missRate: 0 };
  }
}

// Export key prefix helpers
export { KEY_PREFIXES, getKey };


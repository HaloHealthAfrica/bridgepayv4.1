/**
 * User Data Caching Layer
 * Caches user information and frequently accessed user data
 */

import { get, set, getOrSet, invalidate, getKey, KEY_PREFIXES } from './redis.js';
import sql from '../../web/src/app/api/utils/sql.js';

// Cache TTLs (in seconds)
const TTL = {
  USER_DATA: 600, // 10 minutes - user data changes infrequently
  USER_ROLE: 300, // 5 minutes - roles change rarely
};

/**
 * Get user data from cache or database
 */
export async function getCachedUser(userId) {
  const cacheKey = getKey(KEY_PREFIXES.USER_DATA, userId);

  return await getOrSet(
    cacheKey,
    async () => {
      // Fetch from database
      const rows = await sql(
        "SELECT id, email, name, role, image, created_at FROM auth_users WHERE id = $1 LIMIT 1",
        [userId]
      );
      
      if (!rows || !rows[0]) {
        return null;
      }
      
      return {
        id: rows[0].id,
        email: rows[0].email,
        name: rows[0].name,
        role: rows[0].role || 'customer',
        image: rows[0].image,
        created_at: rows[0].created_at,
      };
    },
    TTL.USER_DATA
  );
}

/**
 * Get user role from cache or database
 */
export async function getCachedUserRole(userId) {
  const cacheKey = getKey(KEY_PREFIXES.USER, userId, 'role');

  return await getOrSet(
    cacheKey,
    async () => {
      // Fetch from database
      const rows = await sql(
        "SELECT role FROM auth_users WHERE id = $1 LIMIT 1",
        [userId]
      );
      
      if (!rows || !rows[0]) {
        return null;
      }
      
      return rows[0].role || 'customer';
    },
    TTL.USER_ROLE
  );
}

/**
 * Invalidate user cache
 */
export async function invalidateUserCache(userId) {
  const patterns = [
    getKey(KEY_PREFIXES.USER_DATA, userId),
    getKey(KEY_PREFIXES.USER, userId, '*'),
  ];
  
  let totalDeleted = 0;
  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      const { delPattern } = await import('./redis.js');
      totalDeleted += await delPattern(pattern);
    } else {
      totalDeleted += await invalidate(pattern) ? 1 : 0;
    }
  }
  
  return totalDeleted;
}

/**
 * Set user data in cache
 */
export async function setCachedUser(userId, userData) {
  const cacheKey = getKey(KEY_PREFIXES.USER_DATA, userId);
  await set(cacheKey, userData, TTL.USER_DATA);
  
  // Also cache role separately
  if (userData.role) {
    const roleKey = getKey(KEY_PREFIXES.USER, userId, 'role');
    await set(roleKey, userData.role, TTL.USER_ROLE);
  }
}


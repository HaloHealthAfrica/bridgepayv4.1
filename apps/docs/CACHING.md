# Caching Documentation

Documentation for the Redis caching layer implementation.

## Overview

The caching layer provides fast access to frequently queried data, reducing database load and improving response times. It uses Redis for in-memory caching with automatic invalidation.

## Cached Data

### Wallet Data
- **Wallet balances** - Cached for 60 seconds
- **Pending transactions** - Cached for 30 seconds
- **Wallet metadata** - Cached for 5 minutes

### User Data
- **User information** - Cached for 10 minutes
- **User roles** - Cached for 5 minutes

## Cache Keys

Cache keys follow this pattern:
```
wallet:balance:{walletId}:{currency}
wallet:pending:{walletId}
user:data:{userId}
user:{userId}:role
```

## Usage

### Wallet Caching

```javascript
import { getCachedWalletData, invalidateWalletCache } from '@/lib/cache/walletCache';

// Get wallet data (from cache or database)
const walletData = await getCachedWalletData(userId, 'KES');

// Invalidate cache after balance update
await invalidateWalletCache(walletId, userId);
```

### User Caching

```javascript
import { getCachedUser, invalidateUserCache } from '@/lib/cache/userCache';

// Get user data (from cache or database)
const user = await getCachedUser(userId);

// Invalidate cache after user update
await invalidateUserCache(userId);
```

### Generic Caching

```javascript
import { get, set, getOrSet, del } from '@/lib/cache/redis';

// Get from cache
const value = await get('my:cache:key');

// Set in cache with TTL
await set('my:cache:key', { data: 'value' }, 300); // 5 minutes

// Get or set (cache-aside pattern)
const data = await getOrSet(
  'my:cache:key',
  async () => {
    // Fetch from database
    return await fetchFromDatabase();
  },
  300 // TTL in seconds
);

// Delete from cache
await del('my:cache:key');
```

## Cache Invalidation

### Automatic Invalidation

Cache is automatically invalidated when:
- Wallet balance is updated (via `postLedgerAndUpdateBalance`)
- User data is modified (manual invalidation required)

### Manual Invalidation

```javascript
// Invalidate all cache for a user
import { invalidateUser } from '@/lib/cache/redis';
await invalidateUser(userId);

// Invalidate wallet cache
import { invalidateWalletCache } from '@/lib/cache/walletCache';
await invalidateWalletCache(walletId, userId);
```

## Cache TTLs

| Data Type | TTL | Reason |
|-----------|-----|--------|
| Wallet Balance | 60s | Changes frequently with transactions |
| Pending Transactions | 30s | Changes often as transactions process |
| Wallet Metadata | 5m | Changes infrequently |
| User Data | 10m | Changes rarely |
| User Role | 5m | Changes rarely |

## Cache-Aside Pattern

The implementation uses the cache-aside pattern:

1. **Check cache** - If data exists, return it
2. **Cache miss** - Fetch from database
3. **Store in cache** - Save for future requests
4. **Return data** - Return to caller

This pattern ensures:
- Cache failures don't break the application
- Data is always fresh (TTL-based expiration)
- Database remains source of truth

## Performance Benefits

### Before Caching
- Wallet balance query: ~50-100ms (database query)
- User data query: ~30-50ms (database query)

### After Caching
- Wallet balance query: ~1-5ms (Redis lookup)
- User data query: ~1-3ms (Redis lookup)

**Improvement**: 10-50x faster for cached data

## Monitoring

### Cache Statistics

```javascript
import { getStats } from '@/lib/cache/redis';

const stats = await getStats();
// Returns: { totalKeys, hitRate, missRate }
```

### Health Check

Cache status is included in `/api/health/detailed`:

```json
{
  "checks": {
    "cache": {
      "status": "healthy",
      "totalKeys": 1000,
      "hitRate": 0.85
    }
  }
}
```

## Best Practices

1. **Set appropriate TTLs** - Balance freshness vs. performance
2. **Invalidate on updates** - Always invalidate cache when data changes
3. **Handle cache failures gracefully** - Don't fail requests if cache is down
4. **Monitor hit rates** - Aim for >70% cache hit rate
5. **Use cache-aside pattern** - Keep database as source of truth

## Troubleshooting

### Low Cache Hit Rate

- Check TTLs (may be too short)
- Verify cache invalidation is working
- Check if data is being accessed frequently enough

### Cache Not Updating

- Verify cache invalidation is called after updates
- Check TTL hasn't expired
- Ensure cache keys match

### Redis Connection Issues

- Cache operations fail gracefully (return null)
- Application continues to work (falls back to database)
- Check Redis connection in health check

## Future Enhancements

- **Cache warming** - Pre-populate cache on startup
- **Cache compression** - Compress large values
- **Distributed caching** - Multi-instance cache sharing
- **Cache analytics** - Detailed hit/miss tracking
- **Smart invalidation** - Invalidate related cache keys automatically

---

**Last Updated**: 2024-01-01


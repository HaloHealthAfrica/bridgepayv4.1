/**
 * Wallet Caching Layer
 * Caches wallet balances and related data
 */

import { get, set, getOrSet, invalidateWallet, getKey, KEY_PREFIXES } from './redis.js';
import sql from '../../web/src/app/api/utils/sql.js';

// Cache TTLs (in seconds)
const TTL = {
  BALANCE: 60, // 1 minute - balances change frequently
  PENDING: 30, // 30 seconds - pending transactions change often
  WALLET_DATA: 300, // 5 minutes - wallet metadata changes less often
};

/**
 * Get wallet balance from cache or database
 */
export async function getCachedBalance(userId, currency = 'KES', walletId = null) {
  const cacheKey = walletId 
    ? getKey(KEY_PREFIXES.WALLET_BALANCE, walletId, currency)
    : getKey(KEY_PREFIXES.WALLET_BALANCE, userId, currency);

  return await getOrSet(
    cacheKey,
    async () => {
      // Fetch from database
      const rows = await sql(
        "SELECT id, user_id, currency, balance FROM wallets WHERE user_id = $1 AND currency = $2 LIMIT 1",
        [userId, currency]
      );
      
      if (!rows || !rows[0]) {
        return null;
      }
      
      return {
        wallet_id: rows[0].id,
        user_id: rows[0].user_id,
        currency: rows[0].currency,
        balance: Number(rows[0].balance || 0),
      };
    },
    TTL.BALANCE
  );
}

/**
 * Get pending transactions from cache or database
 */
export async function getCachedPending(walletId) {
  const cacheKey = getKey(KEY_PREFIXES.WALLET_PENDING, walletId);

  return await getOrSet(
    cacheKey,
    async () => {
      // Fetch pending topups
      const pendingTopups = await sql(
        "SELECT COALESCE(SUM(amount),0) AS sum FROM wallet_funding_sessions WHERE wallet_id = $1 AND status = 'pending'",
        [walletId]
      );
      
      // Fetch pending withdrawals
      const pendingWithdrawals = await sql(
        "SELECT COALESCE(SUM(amount),0) AS sum FROM wallet_withdrawals WHERE wallet_id = $1 AND status IN ('pending','processing')",
        [walletId]
      );
      
      const topups = Number(pendingTopups?.[0]?.sum || 0);
      const withdrawals = Number(pendingWithdrawals?.[0]?.sum || 0);
      const pending = topups - withdrawals;
      
      return {
        pending,
        pending_topups: topups,
        pending_withdrawals: withdrawals,
      };
    },
    TTL.PENDING
  );
}

/**
 * Get complete wallet data (balance + pending)
 */
export async function getCachedWalletData(userId, currency = 'KES') {
  const balanceData = await getCachedBalance(userId, currency);
  
  if (!balanceData) {
    return null;
  }
  
  const pendingData = await getCachedPending(balanceData.wallet_id);
  
  return {
    ...balanceData,
    ...pendingData,
  };
}

/**
 * Invalidate wallet cache after balance update
 */
export async function invalidateWalletCache(walletId, userId = null) {
  return await invalidateWallet(walletId, userId);
}

/**
 * Set wallet balance in cache (for immediate updates)
 */
export async function setCachedBalance(walletId, userId, currency, balance) {
  const cacheKey = getKey(KEY_PREFIXES.WALLET_BALANCE, walletId, currency);
  await set(cacheKey, {
    wallet_id: walletId,
    user_id: userId,
    currency,
    balance: Number(balance),
  }, TTL.BALANCE);
  
  // Also cache by user ID
  const userCacheKey = getKey(KEY_PREFIXES.WALLET_BALANCE, userId, currency);
  await set(userCacheKey, {
    wallet_id: walletId,
    user_id: userId,
    currency,
    balance: Number(balance),
  }, TTL.BALANCE);
}


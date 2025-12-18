/**
 * Shared Redis Connection
 * Provides a single Redis connection for all queues to avoid connection limits
 */

import Redis from 'ioredis';

// Create single Redis connection
export const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: false,
});

// Connection event handlers
connection.on('connect', () => {
  console.log('[Redis] Connected to Redis');
});

connection.on('ready', () => {
  console.log('[Redis] Redis ready');
});

connection.on('error', (err) => {
  console.error('[Redis] Connection error:', err);
});

connection.on('close', () => {
  console.log('[Redis] Connection closed');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Redis] Closing connection...');
  await connection.quit();
});

process.on('SIGINT', async () => {
  console.log('[Redis] Closing connection...');
  await connection.quit();
});


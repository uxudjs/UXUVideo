import { Redis } from '@upstash/redis';

import { getRuntimeEnvValue } from '@/lib/server/runtime-env';

let cachedRedis: Redis | undefined;

/**
 * Build the shared Upstash client lazily from the server environment.
 *
 * Returns `null` when Upstash is not configured, which callers should treat as
 * "server-side sync unavailable" rather than as a request failure.
 */
export function getRedisClient(): Redis | null {
  if (cachedRedis) {
    return cachedRedis;
  }

  const url = getRuntimeEnvValue('UPSTASH_REDIS_REST_URL');
  const token = getRuntimeEnvValue('UPSTASH_REDIS_REST_TOKEN');
  if (!url || !token) {
    return null;
  }

  cachedRedis = new Redis({
    url,
    token,
  });
  return cachedRedis;
}

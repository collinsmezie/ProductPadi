import { getRedisClient } from '../config/redis.config';

// Simple operations with Redis
export const setRedisValue = async (key: string, value: string, expireInSeconds?: number): Promise<void> => {
  const client = await getRedisClient();
  if (expireInSeconds) {
    await client.set(key, value, { EX: expireInSeconds });
  } else {
    await client.set(key, value);
  }
};

export const getRedisValue = async (key: string): Promise<string | null> => {
  const client = await getRedisClient();
  return await client.get(key);
};

export const deleteRedisKey = async (key: string): Promise<void> => {
  const client = await getRedisClient();
  await client.del(key);
};

export const redisKeyExists = async (key: string): Promise<boolean> => {
  const client = await getRedisClient();
  const result = await client.exists(key);
  return result === 1;
};

export const pingRedis = async (): Promise<string> => {
  const client = await getRedisClient();
  return await client.ping();
};

// Higher-order function for Redis operations with error handling
export const withRedis = async <T>(operation: (client: any) => Promise<T>): Promise<T> => {
  try {
    const client = await getRedisClient();
    return await operation(client);
  } catch (error) {
    console.error('Redis operation failed:', error);
    throw error;
  }
};

// Example of how to use the higher-order function
export const incrementValue = async (key: string): Promise<number> => {
  return withRedis(async (client) => {
    return await client.incr(key);
  });
};
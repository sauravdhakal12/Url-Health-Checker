import { connection } from '../queue/queue';

const CACHE_KEY = 'batches:list';
const TTL_SECONDS = 30;

export async function getCachedBatchList(): Promise<string | null> {
  return connection.get(CACHE_KEY);
}

export async function setCachedBatchList(json: string): Promise<void> {
  await connection.set(CACHE_KEY, json, 'EX', TTL_SECONDS);
}

export async function invalidateBatchListCache(): Promise<void> {
  await connection.del(CACHE_KEY);
}

import IORedis from 'ioredis';
import { BatchLiveEvent } from 'shared';

export const publisher = new IORedis(process.env.REDIS_URL!);

export async function publishBatchEvent(batchId: string, payload: BatchLiveEvent) {
  await publisher.publish(`batch:${batchId}`, JSON.stringify(payload));
}

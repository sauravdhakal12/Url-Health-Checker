import IORedis from 'ioredis';

export const subscriber = new IORedis(process.env.REDIS_URL!);

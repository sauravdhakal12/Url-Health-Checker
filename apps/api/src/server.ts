import Fastify from 'fastify';
import cors from '@fastify/cors';
import { batchRoutes } from './routes/batches';
import { batchActionRoutes } from './routes/batch-actions';
import { eventRoutes } from './routes/events';

export async function buildServer() {
  const fastify = Fastify({ logger: true });

  await fastify.register(cors, { origin: true });
  fastify.register(batchRoutes, { prefix: '/batches' });
  fastify.register(batchActionRoutes, { prefix: '/batches' });
  fastify.register(eventRoutes, { prefix: '/batches' });

  return fastify;
}

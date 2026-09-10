import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../db/client';
import { checkUrlQueue } from '../queue/queue';
import { parseAndValidateUrls } from '../lib/parse-input';
import { getCachedBatchList, setCachedBatchList, invalidateBatchListCache } from '../cache/batch-list-cache';

const createBatchSchema = {
  body: {
    type: 'object',
    required: ['urls'],
    properties: {
      urls: {
        type: 'array',
        items: { type: 'string', format: 'uri' },
        minItems: 1,
      },
    },
  },
} as const;

export const batchRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/', { schema: createBatchSchema }, async (request, reply) => {
    const { urls } = request.body as { urls: string[] };
    const cleanUrls = parseAndValidateUrls(urls);

    if (cleanUrls.length === 0) {
      return reply.code(400).send({ error: 'No valid URLs provided' });
    }

    const batch = await prisma.$transaction(async (tx: any) => {
      const batch = await tx.batch.create({
        data: { totalUrls: cleanUrls.length, status: 'pending' },
      });
      await tx.urlCheck.createMany({
        data: cleanUrls.map((url) => ({ batchId: batch.id, url, status: 'pending' })),
      });
      return batch;
    });

    const urlChecks = await prisma.urlCheck.findMany({ where: { batchId: batch.id } });

    await Promise.all(
      urlChecks.map((uc: any) =>
        checkUrlQueue.add(
          'checkUrl',
          { urlCheckId: uc.id, url: uc.url },
          { jobId: uc.id, attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
        ),
      ),
    );

    await prisma.batch.update({ where: { id: batch.id }, data: { status: 'running' } });
    await invalidateBatchListCache();

    return reply.code(201).send({ batchId: batch.id, totalUrls: cleanUrls.length });
  });

  fastify.get('/', async (request, reply) => {
    const cached = await getCachedBatchList();
    if (cached) {
      reply.header('X-Cache', 'HIT');
      return reply.send(JSON.parse(cached));
    }

    const batches = await prisma.batch.findMany({ orderBy: { createdAt: 'desc' } });
    await setCachedBatchList(JSON.stringify(batches));
    reply.header('X-Cache', 'MISS');
    return reply.send(batches);
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const batch = await prisma.batch.findUnique({
      where: { id },
      include: { urlChecks: true },
    });

    if (!batch) {
      return reply.code(404).send({ error: 'Batch not found' });
    }

    return reply.send(batch);
  });
};

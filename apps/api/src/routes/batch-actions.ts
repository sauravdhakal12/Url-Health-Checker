import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../db/client';
import { checkUrlQueue, connection } from '../queue/queue';
import { invalidateBatchListCache } from '../cache/batch-list-cache';

export const batchActionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/:id/cancel', async (request, reply) => {
    const { id: batchId } = request.params as { id: string };

    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch || batch.status === 'completed' || batch.status === 'cancelled') {
      return reply.code(400).send({ error: 'Cannot cancel' });
    }

    await prisma.batch.update({ where: { id: batchId }, data: { status: 'cancelled' } });

    const pendingUrlChecks = await prisma.urlCheck.findMany({
      where: { batchId, status: 'pending' },
      select: { id: true },
    });
    
    await Promise.all(
      pendingUrlChecks.map(async (uc: any) => {
        const job = await checkUrlQueue.getJob(uc.id);
        if (job) await job.remove();
      }),
    );

    await prisma.urlCheck.updateMany({
      where: { batchId, status: 'pending' },
      data: { status: 'cancelled' },
    });

    await invalidateBatchListCache();
    await connection.publish(`batch:${batchId}`, JSON.stringify({ type: 'batch_cancelled' }));

    return reply.send({ ok: true });
  });

  fastify.post('/:id/retry-failed', async (request, reply) => {
    const { id: batchId } = request.params as { id: string };

    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch || batch.status === 'cancelled') {
      return reply.code(400).send({ error: 'Cannot retry cancelled batch' });
    }

    const failed = await prisma.urlCheck.findMany({
      where: { batchId, status: 'failed' },
    });

    await prisma.urlCheck.updateMany({
      where: { batchId, status: 'failed' },
      data: { status: 'pending', attemptCount: 0, errorMessage: null },
    });

    await Promise.all(
      failed.map((uc: any) =>
        checkUrlQueue.add(
          'checkUrl',
          { urlCheckId: uc.id, url: uc.url },
          { jobId: `${uc.id}:retry:${Date.now()}`, attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
        ),
      ),
    );

    await prisma.batch.update({ where: { id: batchId }, data: { status: 'running' } });
    await invalidateBatchListCache();
    await connection.publish(`batch:${batchId}`, JSON.stringify({ type: 'batch_retried' }));

    return reply.send({ ok: true, retried: failed.length });
  });
};

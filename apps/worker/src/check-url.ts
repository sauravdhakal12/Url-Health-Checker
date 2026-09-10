import { Job } from 'bullmq';
import { prisma } from './db/client';
import { publishBatchEvent, publisher } from './publisher';
import { Semaphore } from 'redis-semaphore';
import { connection } from './redis';

interface CheckUrlJobData {
  urlCheckId: string;
  url: string;
}

export async function processCheckUrlJob(job: Job<CheckUrlJobData>) {
  const { urlCheckId, url } = job.data;

  const urlCheck = await prisma.urlCheck.findUniqueOrThrow({ where: { id: urlCheckId } });

  const batch = await prisma.batch.findUniqueOrThrow({ where: { id: urlCheck.batchId } });
  if (batch.status === 'cancelled') {
    await prisma.urlCheck.update({
      where: { id: urlCheckId },
      data: { status: 'cancelled' },
    });
    await publishBatchEvent(urlCheck.batchId, { urlCheckId, status: 'cancelled' });
    return;
  }

  await prisma.urlCheck.update({
    where: { id: urlCheckId },
    data: { status: 'in_progress', attemptCount: { increment: 1 } },
  });

  const semaphore = new Semaphore(connection, 'global-http-concurrency', 5);
  await semaphore.acquire();

  const startedAt = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(url, { signal: controller.signal, redirect: 'follow' });

    const html = response.headers.get('content-type')?.includes('text/html')
      ? await response.text()
      : null;

    clearTimeout(timeout);
    const responseMs = Date.now() - startedAt;
    const pageTitle = html ? extractTitle(html) : null;

    await prisma.urlCheck.update({
      where: { id: urlCheckId },
      data: {
        status: 'done',
        httpStatus: response.status,
        responseMs,
        pageTitle,
        errorMessage: null,
      },
    });

    await publishBatchEvent(urlCheck.batchId, {
      urlCheckId, status: 'done', httpStatus: response.status, responseMs, pageTitle,
    });
  } catch (err) {
    const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 1) - 1;

    if (isLastAttempt) {
      await prisma.urlCheck.update({
        where: { id: urlCheckId },
        data: { status: 'failed', errorMessage: (err as Error).message },
      });
      await publishBatchEvent(urlCheck.batchId, {
        urlCheckId, status: 'failed', errorMessage: (err as Error).message,
      });
      await maybeMarkBatchCompleted(urlCheck.batchId);
      return;
    }

    throw err;
  } finally {
    await semaphore.release();
  }

  await maybeMarkBatchCompleted(urlCheck.batchId);
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() : null;
}

async function maybeMarkBatchCompleted(batchId: string) {
  const batch = await prisma.batch.findUnique({ where: { id: batchId } });
  if (batch?.status === 'cancelled') return;

  const remaining = await prisma.urlCheck.count({
    where: { batchId, status: { in: ['pending', 'in_progress'] } },
  });
  if (remaining === 0) {
    await prisma.batch.update({ where: { id: batchId }, data: { status: 'completed' } });
    await publisher.del('batches:list');
    await publishBatchEvent(batchId, { type: 'batch_completed' });
  }
}

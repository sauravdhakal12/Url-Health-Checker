import { FastifyPluginAsync } from 'fastify';
import { subscriber } from '../pubsub/subscriber';
import { EventEmitter } from 'events';
import { prisma } from '../db/client';

const sseEmitter = new EventEmitter();
const activeChannels = new Map<string, number>();

subscriber.on('message', (ch, msg) => sseEmitter.emit(ch, msg));

export const eventRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/:id/events', async (request, reply) => {
    const { id: batchId } = request.params as { id: string };
    const channel = `batch:${batchId}`;

    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': request.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true',
    });

    const onMessage = (message: string) => {
      reply.raw.write(`data: ${message}\n\n`);
    };

    const currentCount = activeChannels.get(channel) || 0;
    activeChannels.set(channel, currentCount + 1);
    if (currentCount === 0) await subscriber.subscribe(channel);

    sseEmitter.on(channel, onMessage);

    // Immediate DB sync to fix race condition for fast workers
    const batch = await prisma.batch.findUnique({ 
      where: { id: batchId }, 
      include: { urlChecks: true } 
    });
    
    if (batch) {
      batch.urlChecks.forEach((uc: any) => {
        onMessage(JSON.stringify({ 
          urlCheckId: uc.id, 
          status: uc.status, 
          httpStatus: uc.httpStatus, 
          responseMs: uc.responseMs, 
          pageTitle: uc.pageTitle 
        }));
      });
      if (batch.status === 'completed') {
        onMessage(JSON.stringify({ type: 'batch_completed' }));
      } else if (batch.status === 'cancelled') {
        onMessage(JSON.stringify({ type: 'batch_cancelled' }));
      }
    }

    const heartbeat = setInterval(() => reply.raw.write(': heartbeat\n\n'), 15_000);

    request.raw.on('close', () => {
      clearInterval(heartbeat);
      sseEmitter.off(channel, onMessage);
      const newCount = (activeChannels.get(channel) || 1) - 1;
      if (newCount === 0) {
        activeChannels.delete(channel);
        subscriber.unsubscribe(channel);
      } else {
        activeChannels.set(channel, newCount);
      }
    });
  });
};

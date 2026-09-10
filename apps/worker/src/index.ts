import { Worker } from 'bullmq';
import { processCheckUrlJob } from './check-url';
import { connection } from './redis';

const worker = new Worker('checkUrl', processCheckUrlJob, {
  connection,
  concurrency: 5,
  limiter: { max: 5, duration: 5000 },
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

process.on('SIGTERM', async () => {
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await worker.close();
  process.exit(0);
});

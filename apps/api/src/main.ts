import { buildServer } from './server';

async function main() {
  const server = await buildServer();
  const port = parseInt(process.env.PORT || '4000', 10);
  
  try {
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`API server listening on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }

  const shutdown = async () => {
    console.log('Shutting down API server...');
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();

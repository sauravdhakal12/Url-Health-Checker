module.exports = {
  apps: [
    {
      name: 'url-health-api',
      script: 'node',
      args: 'dist/main.js',
      cwd: './apps/api',
      env: {
        NODE_ENV: 'production',
      }
    },
    {
      name: 'url-health-worker',
      script: 'node',
      args: 'dist/index.js',
      cwd: './apps/worker',
      env: {
        NODE_ENV: 'production',
      }
    },
    {
      name: 'url-health-web',
      script: 'pnpm',
      args: 'run start',
      cwd: './web',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      }
    }
  ]
};

import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

const server = app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`[HackOS Backend] Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  console.log(`[HackOS Backend] Healthcheck available at http://127.0.0.1:${env.PORT}/api/v1/health`);
});

// Graceful shutdown handling
function shutdown(signal: string) {
  console.log(`[HackOS Backend] Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('[HackOS Backend] Closed out remaining connections.');
    process.exit(0);
  });

  // Force shutdown if connections do not close in 10s
  setTimeout(() => {
    console.error('[HackOS Backend] Could not close connections in time, forcefully shutting down.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

import { Request, Response } from 'express';
import { prisma } from '../../lib/db.js';

export async function getHealth(_req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  let dbStatus: 'connected' | 'disconnected' | 'unreachable' = 'disconnected';
  let dbLatencyMs: number | null = null;

  try {
    const dbPingStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbPingStart;
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'disconnected';
    // Do not crash the health check if DB is not yet migrated/provisioned
  }

  res.status(200).json({
    data: {
      status: 'ok',
      service: 'hackos-api',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      durationMs: Date.now() - startTime,
    },
  });
}

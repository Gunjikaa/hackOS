import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './modules/health/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(helmet());

  // Cross-Origin Resource Sharing (allowed for Next.js frontend with credentials)
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    })
  );

  // Cookie and JSON body parsing
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Correlation IDs and Structured Logging
  app.use(requestLogger);

  // Mount API v1 Routes
  const apiV1Router = express.Router();
  apiV1Router.use('/', healthRouter);
  apiV1Router.use('/auth', authRouter);

  app.use('/api/v1', apiV1Router);

  // 404 Handler for undefined API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.originalUrl} not found.`,
        requestId: req.headers['x-request-id'],
      },
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';

// Wrapper for async route handlers to catch errors and pass them to next()
export const asyncErrorWrapper = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Global error handler middleware
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  Sentry.captureException(err);
  
  console.error('[Global Error]', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
  });
};

import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

export abstract class BaseController {
  protected handleSuccess(res: Response, data: any, statusCode: number = 200): void {
    res.status(statusCode).json({
      success: true,
      data,
    });
  }

  protected handleError(error: any, res: Response, context: string): void {
    Sentry.captureException(error, { extra: { context } });
    
    console.error(`[${context}] Error:`, error);
    
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';

    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
}

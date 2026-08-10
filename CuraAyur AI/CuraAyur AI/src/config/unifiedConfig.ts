import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  db: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },
  genai: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
  }
};

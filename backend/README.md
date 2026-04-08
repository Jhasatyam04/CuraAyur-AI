# CuraAyur AI Backend

Deployable Node.js backend for authentication and prediction APIs.

## Features
- JWT-based auth with HttpOnly cookie sessions (`signup`, `login`, `me`, `logout`)
- Protected prediction endpoints for `cardio`, `diabetes`, and `breast_cancer`
- PostgreSQL persistence for users and prediction history
- Docker-ready deployment

## API Endpoints
- `GET /api/health`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me` (HttpOnly cookie session or Bearer token)
- `POST /api/auth/logout`
- `POST /api/predictions/cardio`
- `POST /api/predictions/diabetes`
- `POST /api/predictions/breast_cancer`
- `GET /api/predictions/history/me`

## Local Setup
1. `cd backend`
2. Ensure PostgreSQL is running and create database `curaayur` (or use your own name)
3. Copy `.env.example` to `.env` (or create `.env` manually on Windows)
4. Set `DATABASE_URL`, `JWT_SECRET`, and `CORS_ORIGIN`
5. `npm install`
6. `npm run dev`

Backend runs on `http://localhost:5000` by default.

## Vercel Deploy
1. Push the project root `zappizo/` to GitHub.
2. Create a Neon or Supabase PostgreSQL database.
3. Set these environment variables in Vercel:
	- `JWT_SECRET`
	- `DATABASE_URL`
	- `CORS_ORIGIN` (your Vercel domain, comma-separated if needed)
	- `COOKIE_SECURE=true`
	- `NODE_ENV=production`
4. Deploy the root project folder in Vercel.

The frontend is served statically and API routes are handled by `/api/*` serverless functions.

## Local Dev Options
### Option 1: Node host
- Set env vars from `.env.example`
- Run `npm install`
- Run `npm start`

### Option 2: Docker Compose (backend + PostgreSQL)
- `docker compose up --build`

## Security Notes
- Set a strong `JWT_SECRET` in production.
- Set `CORS_ORIGIN` to exact frontend domain(s), comma-separated.
- Use secure cookies over HTTPS in production (`COOKIE_SECURE=true`).

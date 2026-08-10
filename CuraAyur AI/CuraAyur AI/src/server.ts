import './instrument'; // Must be the first import to initialize Sentry
import app from './app';
import { config } from './config/unifiedConfig';
import { spawn } from 'child_process';
import path from 'path';

const server = app.listen(config.port, () => {
  console.log(`[Server] Server is running on http://localhost:${config.port} in ${config.env} mode`);
  
  // Spawn the Python ML server
  const mlEnginePath = path.join(__dirname, '../../fl_prediction_engine');
  console.log(`[ML Server] Starting Python ML server in ${mlEnginePath}`);
  
  // Use python -m uvicorn to ensure it finds the module correctly
  const mlProcess = spawn('python3', ['-m', 'uvicorn', 'serving.main:app', '--host', '0.0.0.0', '--port', '8000'], {
    cwd: mlEnginePath,
    stdio: 'inherit', // Piping output to Node's console
    shell: true
  });

  mlProcess.on('error', (err) => {
    console.error('[ML Server] Failed to start:', err);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', err);
  server.close(() => {
    process.exit(1);
  });
});

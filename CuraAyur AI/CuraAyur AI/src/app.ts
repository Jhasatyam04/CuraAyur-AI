import express from 'express';
import cors from 'cors';
import { config } from './config/unifiedConfig';
import { errorHandler } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import predictionRoutes from './routes/prediction.routes';
import path from 'path';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve Static Frontend Files
app.use(express.static(path.join(__dirname, '../')));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', env: config.env });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/predict', predictionRoutes);

// Error Handling (Must be last)
app.use(errorHandler);

export default app;

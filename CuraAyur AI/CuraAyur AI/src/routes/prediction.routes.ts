import { Router } from 'express';
import { PredictionController } from '../controllers/PredictionController';
import { MLService } from '../services/mlService';
import { PredictionRepository } from '../repositories/PredictionRepository';
import { GenAIService } from '../services/genAiService';
import { authenticate } from '../middleware/auth.middleware';
import { asyncErrorWrapper } from '../middleware/error.middleware';

const router = Router();

const mlService = new MLService();
const genAiService = new GenAIService();
const predictionRepository = new PredictionRepository();
const predictionController = new PredictionController(mlService, genAiService, predictionRepository);

// Apply authentication middleware to all prediction routes
router.use(authenticate);

router.post('/diabetes', asyncErrorWrapper((req, res) => predictionController.predictDiabetes(req, res)));
router.post('/cardio', asyncErrorWrapper((req, res) => predictionController.predictCardio(req, res)));
router.post('/breast-cancer', asyncErrorWrapper((req, res) => predictionController.predictBreastCancer(req, res)));
router.get('/history', asyncErrorWrapper((req, res) => predictionController.getHistory(req, res)));

export default router;

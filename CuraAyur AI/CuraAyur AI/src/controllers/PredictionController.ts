import { Response } from 'express';
import { BaseController } from './BaseController';
import { MLService } from '../services/mlService';
import { PredictionRepository } from '../repositories/PredictionRepository';
import { AuthRequest } from '../middleware/auth.middleware';
import { GenAIService } from '../services/genAiService';
import { 
  diabetesPredictionSchema, 
  cardioPredictionSchema, 
  breastCancerPredictionSchema 
} from '../validators/prediction.schema';

export class PredictionController extends BaseController {
  constructor(
    private readonly mlService: MLService,
    private readonly genAiService: GenAIService,
    private readonly predictionRepository: PredictionRepository
  ) {
    super();
  }

  async predictDiabetes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const input = diabetesPredictionSchema.parse(req);
      const userId = req.user!.id;

      // 1. Get Prediction from Python ML Server
      const result = await this.mlService.predictDiabetes(input.body);

      // 2. Get Recommendations from Gen AI
      const recommendation = await this.genAiService.generateRecommendations('Diabetes', input.body, result);

      // 3. Save history in database
      await this.predictionRepository.create({
        userId,
        type: 'diabetes',
        inputData: JSON.stringify(input.body),
        predictionResult: JSON.stringify(result),
        recommendation: JSON.stringify(recommendation)
      });

      this.handleSuccess(res, { ...result, recommendation }, 200);
    } catch (error: any) {
      if (error.issues) {
        error.statusCode = 400;
        error.message = error.issues.map((i: any) => i.message).join(', ');
      }
      this.handleError(error, res, 'PredictionController.predictDiabetes');
    }
  }

  async predictCardio(req: AuthRequest, res: Response): Promise<void> {
    try {
      const input = cardioPredictionSchema.parse(req);
      const userId = req.user!.id;

      const result = await this.mlService.predictCardio(input.body);
      const recommendation = await this.genAiService.generateRecommendations('Cardiovascular Disease', input.body, result);

      await this.predictionRepository.create({
        userId,
        type: 'cardio',
        inputData: JSON.stringify(input.body),
        predictionResult: JSON.stringify(result),
        recommendation: JSON.stringify(recommendation)
      });

      this.handleSuccess(res, { ...result, recommendation }, 200);
    } catch (error: any) {
      if (error.issues) {
        error.statusCode = 400;
        error.message = error.issues.map((i: any) => i.message).join(', ');
      }
      this.handleError(error, res, 'PredictionController.predictCardio');
    }
  }

  async predictBreastCancer(req: AuthRequest, res: Response): Promise<void> {
    try {
      const input = breastCancerPredictionSchema.parse(req);
      const userId = req.user!.id;

      const result = await this.mlService.predictBreastCancer(input.body);
      const recommendation = await this.genAiService.generateRecommendations('Breast Cancer', input.body, result);

      await this.predictionRepository.create({
        userId,
        type: 'breast_cancer',
        inputData: JSON.stringify(input.body),
        predictionResult: JSON.stringify(result),
        recommendation: JSON.stringify(recommendation)
      });

      this.handleSuccess(res, { ...result, recommendation }, 200);
    } catch (error: any) {
      if (error.issues) {
        error.statusCode = 400;
        error.message = error.issues.map((i: any) => i.message).join(', ');
      }
      this.handleError(error, res, 'PredictionController.predictBreastCancer');
    }
  }

  async getHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const history = await this.predictionRepository.findByUserId(userId);
      this.handleSuccess(res, history, 200);
    } catch (error: any) {
      this.handleError(error, res, 'PredictionController.getHistory');
    }
  }
}

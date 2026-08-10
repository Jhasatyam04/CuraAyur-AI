import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { AuthService } from '../services/authService';
import { signupSchema, loginSchema } from '../validators/auth.schema';

export class AuthController extends BaseController {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async signup(req: Request, res: Response): Promise<void> {
    try {
      const input = signupSchema.parse(req);
      const result = await this.authService.signup(input.body);
      this.handleSuccess(res, result, 201);
    } catch (error: any) {
      // Zod validation errors
      if (error.issues) {
        error.statusCode = 400;
        error.message = error.issues.map((i: any) => i.message).join(', ');
      }
      this.handleError(error, res, 'AuthController.signup');
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const input = loginSchema.parse(req);
      const result = await this.authService.login(input.body);
      this.handleSuccess(res, result, 200);
    } catch (error: any) {
      if (error.issues) {
        error.statusCode = 400;
        error.message = error.issues.map((i: any) => i.message).join(', ');
      }
      this.handleError(error, res, 'AuthController.login');
    }
  }
}

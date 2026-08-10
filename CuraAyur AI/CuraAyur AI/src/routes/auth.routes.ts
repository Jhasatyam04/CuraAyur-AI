import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { AuthService } from '../services/authService';
import { UserRepository } from '../repositories/UserRepository';
import { asyncErrorWrapper } from '../middleware/error.middleware';

const router = Router();

const userRepository = new UserRepository();
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

router.post('/signup', asyncErrorWrapper((req, res) => authController.signup(req, res)));
router.post('/login', asyncErrorWrapper((req, res) => authController.login(req, res)));

export default router;

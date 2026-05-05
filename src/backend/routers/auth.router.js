import express from 'express';
import AuthController from '../controllers/auth.controller.js';
import {
  loginSchema,
  registerSchema,
  validateRequest,
} from '../validations/auth.validation.js';
import { verifyToken, rateLimit } from '../middlewares/auth.mw.js';
import { RATE_LIMIT } from '../utils/constants.js';

const router = express.Router();

// Apply rate limiting to auth endpoints
router.post('/login', 
  rateLimit(RATE_LIMIT.LOGIN.maxAttempts, RATE_LIMIT.LOGIN.windowMs), 
  validateRequest(loginSchema), 
  (req, res) => AuthController.login(req, res)
);

router.post('/register', 
  rateLimit(RATE_LIMIT.REGISTER.maxAttempts, RATE_LIMIT.REGISTER.windowMs), 
  validateRequest(registerSchema), 
  (req, res) => AuthController.register(req, res)
);

// Protected endpoints
router.get('/me', 
  verifyToken, 
  (req, res) => AuthController.getProfile(req, res)
);

router.post('/refresh', 
  rateLimit(RATE_LIMIT.REFRESH.maxAttempts, RATE_LIMIT.REFRESH.windowMs), 
  (req, res) => AuthController.refresh(req, res)
);

router.post('/logout', 
  verifyToken, 
  (req, res) => AuthController.logout(req, res)
);

router.post('/change-password', 
  verifyToken, 
  (req, res) => AuthController.changePassword(req, res)
);

export default router;

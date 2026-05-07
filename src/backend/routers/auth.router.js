import express from 'express';
import AuthController from '../controllers/auth.controller.js';
import {
  loginSchema,
  registerSchema,
  validateRequest,
} from '../validations/auth.validation.js';
import { verifyToken } from '../middlewares/auth.mw.js';

const router = express.Router();

// Apply rate limiting to auth endpoints
router.post('/login',  
  validateRequest(loginSchema), 
  (req, res) => AuthController.login(req, res)
);

router.post('/register', 
  validateRequest(registerSchema), 
  (req, res) => AuthController.register(req, res)
);

// Protected endpoints
router.get('/me', 
  verifyToken, 
  (req, res) => AuthController.getProfile(req, res)
);

router.post('/refresh', 
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

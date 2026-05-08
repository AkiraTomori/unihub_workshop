import express from 'express';
import PaymentController from '../controllers/payment.controller.js';
import { verifyToken } from '../middlewares/auth.mw.js';

const router = express.Router();

router.post('/checkout', verifyToken, (req, res) => PaymentController.checkout(req, res));
router.get('/:id', verifyToken, (req, res) => PaymentController.getById(req, res));

export default router;

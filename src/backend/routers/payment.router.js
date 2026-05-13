import express from 'express';
import PaymentController from '../controllers/payment.controller.js';
import RefundController from '../controllers/refund.controller.js';
import { verifyToken } from '../middlewares/auth.mw.js';

const router = express.Router();

// Payment endpoints
router.post('/checkout', verifyToken, (req, res) => PaymentController.checkout(req, res));

router.get('/me', verifyToken, (req, res) => PaymentController.listMine(req, res));

router.get('/:id', verifyToken, (req, res) => PaymentController.getById(req, res));

// Refund endpoints
router.post('/refund/:paymentId', verifyToken, (req, res) => RefundController.refundPayment(req, res));

router.get('/refunds/me', verifyToken, (req, res) => RefundController.listMyRefunds(req, res));

router.get('/refund/:paymentId/status', verifyToken, (req, res) => RefundController.getRefundStatus(req, res));

export default router;

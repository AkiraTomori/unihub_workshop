import express from 'express';
import NotificationController from '../controllers/notification.controller.js';
import { verifyToken } from '../middlewares/auth.mw.js';

const router = express.Router();

router.get('/me', verifyToken, (req, res) => NotificationController.listMine(req, res));
router.patch('/:id/read', verifyToken, (req, res) => NotificationController.markRead(req, res));

export default router;

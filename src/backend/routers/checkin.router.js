import express from 'express';
import CheckinController from '../controllers/checkin.controller.js';
import { requireRole, verifyToken } from '../middlewares/auth.mw.js';

const router = express.Router();

router.post('/scan', verifyToken, requireRole(['CHECKER', 'ADMIN']), (req, res) => CheckinController.scan(req, res));

router.post('/sync', verifyToken, requireRole(['CHECKER', 'ADMIN']), (req, res) => CheckinController.sync(req, res));

router.get('/me', verifyToken, (req, res) => CheckinController.listMine(req, res));

export default router;

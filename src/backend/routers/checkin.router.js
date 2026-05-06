import express from 'express';
import CheckinController from '../controllers/checkin.controller.js';
import { requireRole, verifyToken } from '../middlewares/auth.mw.js';

const router = express.Router();

router.post('/sync', verifyToken, requireRole(['CHECKER', 'ADMIN']), (req, res) => CheckinController.sync(req, res));

export default router;

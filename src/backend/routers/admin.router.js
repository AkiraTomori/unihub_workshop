import express from 'express';
import AdminController from '../controllers/admin.controller.js';
import { requireRole, verifyToken } from '../middlewares/auth.mw.js';

const router = express.Router();

router.use(verifyToken, requireRole(['ADMIN']));

router.post('/workshops', (req, res) => AdminController.createWorkshop(req, res));
router.patch('/workshops/:workshopId/cancel', (req, res) => AdminController.cancelWorkshop(req, res));
router.post('/documents', (req, res) => AdminController.uploadDocument(req, res));
router.get('/analytics', (req, res) => AdminController.analytics(req, res));
router.get('/csv-sync/latest', (req, res) => AdminController.csvLatest(req, res));

export default router;

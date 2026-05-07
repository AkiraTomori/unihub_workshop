import express from 'express';
import AdminController from '../controllers/admin.controller.js';
import { requireRole, verifyToken } from '../middlewares/auth.mw.js';
import { createWorkshopSchema, updateWorkshopSchema, validateRequest } from '../validations/workshop.validation.js';

const router = express.Router();

router.use(verifyToken, requireRole(['ADMIN']));

router.get('/rooms', (req, res) => AdminController.listRooms(req, res));
router.get('/workshops/deleted', (req, res) => AdminController.listDeletedWorkshops(req, res));
router.get('/workshops/:id', (req, res) => AdminController.getWorkshopById(req, res));
router.get('/workshops', (req, res) => AdminController.listWorkshops(req, res));
router.post('/workshops', validateRequest(createWorkshopSchema), (req, res) => AdminController.createWorkshop(req, res));
router.put('/workshops/:id', validateRequest(updateWorkshopSchema), (req, res) => AdminController.updateWorkshop(req, res));
router.patch('/workshops/:workshopId/cancel', (req, res) => AdminController.cancelWorkshop(req, res));
router.patch('/workshops/:workshopId/restore', (req, res) => AdminController.restoreWorkshop(req, res));
router.post('/documents', (req, res) => AdminController.uploadDocument(req, res));
router.get('/analytics', (req, res) => AdminController.analytics(req, res));
router.get('/csv-sync/latest', (req, res) => AdminController.csvLatest(req, res));

export default router;

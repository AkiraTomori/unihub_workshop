import express from 'express';
import multer from 'multer';
import AdminController from '../controllers/admin.controller.js';
import NotificationController from '../controllers/notification.controller.js';
import RefundController from '../controllers/refund.controller.js';
import { requireRole, verifyToken } from '../middlewares/auth.mw.js';
import { createWorkshopSchema, updateWorkshopSchema, validateRequest } from '../validations/workshop.validation.js';
import { createRoomSchema, updateRoomSchema, validateRequest as validateRoom } from '../validations/room.validation.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 52428800 } });

router.use(verifyToken, requireRole(['ADMIN']));

router.get('/rooms', (req, res) => AdminController.listRooms(req, res));

router.post('/rooms', validateRoom(createRoomSchema), (req, res) => AdminController.createRoom(req, res));

router.put('/rooms/:id', validateRoom(updateRoomSchema), (req, res) => AdminController.updateRoom(req, res));

router.delete('/rooms/:id', (req, res) => AdminController.deleteRoom(req, res));

router.patch('/rooms/:id/restore', (req, res) => AdminController.restoreRoom(req, res));

router.get('/rooms/deleted', (req, res) => AdminController.listDeletedRooms(req, res));

router.get('/rooms/:roomId/workshops', (req, res) => AdminController.getRoomWorkshops(req, res));

router.get('/workshops/deleted', (req, res) => AdminController.listDeletedWorkshops(req, res));

router.get('/workshops/:id', (req, res) => AdminController.getWorkshopById(req, res));

router.get('/workshops', (req, res) => AdminController.listWorkshops(req, res));

router.post('/workshops', validateRequest(createWorkshopSchema), (req, res) => AdminController.createWorkshop(req, res));

router.put('/workshops/:id', validateRequest(updateWorkshopSchema), (req, res) => AdminController.updateWorkshop(req, res));

router.patch('/workshops/:workshopId/cancel', (req, res) => AdminController.cancelWorkshop(req, res));

router.patch('/workshops/:workshopId/restore', (req, res) => AdminController.restoreWorkshop(req, res));

router.post('/documents', upload.single('file'), (req, res) => AdminController.uploadDocument(req, res));

router.get('/documents/:workshopId', (req, res) => AdminController.getDocument(req, res));

router.patch('/documents/:workshopId/summary', (req, res) => AdminController.startDocumentSummary(req, res));

router.get('/analytics', (req, res) => AdminController.analytics(req, res));

router.get('/csv-sync/latest', (req, res) => AdminController.csvLatest(req, res));

router.post('/csv-sync/upload', upload.single('file'), (req, res) => AdminController.uploadCsvSyncFile(req, res));

router.post('/csv-sync/run', (req, res) => AdminController.triggerCsvSync(req, res));

router.get('/csv-sync-logs', (req, res) => AdminController.getCsvSyncLogs(req, res));

router.get('/audit-logs', (req, res) => AdminController.getAuditLogs(req, res));

router.get('/workshops/:workshopId/registrations', (req, res) => AdminController.getWorkshopRegistrations(req, res));

router.get('/checkins/stats', (req, res) => AdminController.getCheckinStats(req, res));

router.get('/students', (req, res) => AdminController.listStudents(req, res));

router.get('/notifications', (req, res) => NotificationController.listAdmin(req, res));

router.get('/notifications/failed', (req, res) => NotificationController.getFailedNotificationsList(req, res));

router.post('/notifications/replay', (req, res) => NotificationController.replayFailedNotifications(req, res));

router.get('/refunds', (req, res) => RefundController.listAllRefunds(req, res));

router.get('/refunds/stats', (req, res) => RefundController.getRefundStats(req, res));

export default router;

import express from 'express';
import WorkshopController from '../controllers/workshop.controller.js';
import { verifyToken } from '../middlewares/auth.mw.js';

const router = express.Router();

router.get('/', verifyToken, (req, res) => WorkshopController.list(req, res));
router.get('/:workshopId', verifyToken, (req, res) => WorkshopController.detail(req, res));

export default router;

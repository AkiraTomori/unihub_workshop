import express from 'express';
import WorkshopController from '../controllers/workshop.controller.js';
import { verifyToken } from '../middlewares/auth.mw.js';

const router = express.Router();

router.get('/', verifyToken, (req, res) => WorkshopController.list(req, res));

export default router;

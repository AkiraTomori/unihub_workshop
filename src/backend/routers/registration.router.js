import express from 'express';
import RegistrationController from '../controllers/registration.controller.js';
import { verifyToken } from '../middlewares/auth.mw.js';

const router = express.Router();

router.post('/', verifyToken, (req, res) => RegistrationController.create(req, res));
router.get('/me', verifyToken, (req, res) => RegistrationController.listMine(req, res));
router.get('/:id', verifyToken, (req, res) => RegistrationController.getById(req, res));

export default router;

import { Router } from 'express';
import {
  registerStudent,
  loginStudent,
  loginStaff,
  getCurrentUser,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Student Authentication
router.post('/student/register', registerStudent);
router.post('/student/login', loginStudent);

// Canteen Staff Authentication (per canteen)
router.post('/staff/login', loginStaff);

// Profile check
router.get('/me', authenticate, getCurrentUser);

export default router;

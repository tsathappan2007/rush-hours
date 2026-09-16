import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../db/prisma.js';

/**
 * Authenticate JWT token from Authorization header (Bearer <token>)
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid Bearer token.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);

    req.user = decoded; // { id, role, email, canteenId?, ... }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, error: 'Invalid authentication token.' });
  }
}

/**
 * Enforce that the authenticated user is a student
 */
export function requireStudent(req, res, next) {
  if (!req.user || req.user.role !== 'STUDENT') {
    return res.status(403).json({
      success: false,
      error: 'Access denied: Student account required.',
    });
  }
  next();
}

/**
 * Enforce that the authenticated user is staff (and optionally belongs to specified canteen)
 */
export function requireStaff(req, res, next) {
  if (!req.user || (req.user.role !== 'COUNTER_STAFF' && req.user.role !== 'MANAGER')) {
    return res.status(403).json({
      success: false,
      error: 'Access denied: Canteen staff authorization required.',
    });
  }
  next();
}

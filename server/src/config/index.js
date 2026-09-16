import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from current directory or monorepo root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/rush_hours_db';
}

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rush_hours_db',
  jwtSecret: process.env.JWT_SECRET || 'rush_hours_dev_jwt_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },
  cors: {
    studentUrl: process.env.CLIENT_STUDENT_URL || 'http://localhost:5173',
    canteenUrl: process.env.CLIENT_CANTEEN_URL || 'http://localhost:5174',
  },
};

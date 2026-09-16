import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';

import authRoutes from './routes/auth.routes.js';
import canteenRoutes from './routes/canteen.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import paymentsRoutes from './routes/payments.routes.js';
import pickupRoutes from './routes/pickup.routes.js';

const app = express();

// Middleware
app.use(cors({
  origin: [config.cors.studentUrl, config.cors.canteenUrl],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'rush-hours-server',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/canteens', canteenRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/pickup', pickupRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

app.listen(config.port, () => {
  console.log(`[Rush Hours API] Server running on http://localhost:${config.port} (${config.nodeEnv})`);
  console.log(`  - Student App URL: ${config.cors.studentUrl}`);
  console.log(`  - Canteen Portal URL: ${config.cors.canteenUrl}`);
});

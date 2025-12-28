import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import playersRoutes from './routes/playersRoutes';
import matchesRoutes from './routes/matchesRoutes';
import leaguesRoutes from './routes/leaguesRoutes';
import rankingsRoutes from './routes/rankingsRoutes';
import queueRoutes from './routes/queueRoutes';
import adminRoutes from './routes/adminRoutes';
import weeklyEventsRoutes from './routes/weeklyEventsRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/players', playersRoutes);
app.use('/matches', matchesRoutes);
app.use('/leagues', leaguesRoutes);
app.use('/rankings', rankingsRoutes);
app.use('/queue', queueRoutes);
app.use('/admin', adminRoutes);
app.use('/weekly-events', weeklyEventsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
});

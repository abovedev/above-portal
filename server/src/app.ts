import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { rateLimit } from 'express-rate-limit';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import pageRoutes from './routes/pages';
import assignmentRoutes from './routes/assignments';
import widgetRoutes from './routes/widgets';
import announcementRoutes from './routes/announcements';
import notificationRoutes from './routes/notifications';
import taskRoutes from './routes/tasks';
import quickLinkRoutes from './routes/quickLinks';
import settingsRoutes from './routes/settings';
import asanaRoutes from './routes/asana';
import googleRoutes from './routes/google';
import aiRoutes from './routes/ai';
import aiSettingsRoutes from './routes/aiSettings';
import { errorHandler } from './middleware/errorHandler';

const app = express();
app.set('trust proxy', 1);
const uploadsDir = process.env.UPLOAD_DIR ||
  (process.env.NODE_ENV === 'production' ? '/tmp/uploads' : path.join(process.cwd(), 'uploads'));

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin === o || origin.endsWith('.vercel.app'))) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

app.use('/api/auth', rateLimit({ windowMs: 1 * 60 * 1000, max: 1000 }));
app.use('/api', rateLimit({ windowMs: 1 * 60 * 1000, max: 5000 }));

app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/widgets', widgetRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/quick-links', quickLinkRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/asana', asanaRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin/ai-settings', aiSettingsRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

app.use(errorHandler);

export default app;

import express from 'express';
import { createServer } from 'node:http';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { attachRequestId } from './middlewares/requestId.js';
import { createRealtimeServer } from './realtime.js';
import { checkDatabaseConnection } from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(origin => origin.trim()).filter(Boolean);
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? (process.env.VERCEL ? 1 : 0));
app.set('trust proxy', Number.isInteger(trustProxyHops) && trustProxyHops >= 0 ? trustProxyHops : 0);

app.use(attachRequestId);
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(cors({
  exposedHeaders: ['X-Request-ID', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'Retry-After'],
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost(?::\d+)?$/.test(origin)) return callback(null, true);
    return callback(null, false);
  },
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: '🚀 DevTracker API is running successfully on Vercel!',
    healthCheck: '/api/health',
    version: '1.0.0',
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'DevTracker API is running' });
});

app.get('/api/health/ready', async (req, res) => {
  try {
    await checkDatabaseConnection();
    res.json({ status: 'ready', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'not_ready', database: 'unavailable' });
  }
});

// Database connection middleware for authenticated and data-backed routes.
app.use(async (req, res, next) => {
  try {
    await checkDatabaseConnection();
    next();
  } catch (error) {
    next(error);
  }
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

// Standalone Server & WebSockets (for local development or Docker / VPS)
if (!process.env.VERCEL) {
  const httpServer = createServer(app);
  const io = await createRealtimeServer(httpServer);
  app.set('io', io);

  httpServer.listen(PORT, async () => {
    console.log(`🚀 DevTracker API running on http://localhost:${PORT}`);
    try { await checkDatabaseConnection(); }
    catch (error) { console.warn(`Database is not ready: ${error.message}`); }
  });
}

export default app;

import express from 'express';
import { createServer } from 'node:http';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { createRealtimeServer } from './realtime.js';
import { checkDatabaseConnection } from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Database connection middleware for Serverless & standalone environments
app.use(async (req, res, next) => {
  try {
    await checkDatabaseConnection();
    next();
  } catch (error) {
    next(error);
  }
});

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
    await checkDatabaseConnection();
  });
}

export default app;

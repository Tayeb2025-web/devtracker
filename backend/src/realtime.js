import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { hashToken } from './middlewares/auth.js';
import { AuthSession, User } from './models/UserModel.js';
import { LeagueModel } from './models/SocialModel.js';

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : true;

async function configureRedisAdapter(io) {
  if (!process.env.REDIS_URL) return;
  try {
    const publisher = createClient({ url: process.env.REDIS_URL });
    const subscriber = publisher.duplicate();
    await Promise.all([publisher.connect(), subscriber.connect()]);
    io.adapter(createAdapter(publisher, subscriber));
    console.log('Redis adapter enabled for realtime events');
  } catch (err) {
    console.warn('Redis adapter error:', err.message);
  }
}

export async function createRealtimeServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));

      const session = await AuthSession.findOne({
        token_hash: hashToken(token),
        expires_at: { $gt: new Date() }
      }).lean();

      if (!session) return next(new Error('Session expired'));

      const user = await User.findById(session.user_id).lean() || await User.findOne({ legacy_id: Number(session.user_id) || -1 }).lean();
      if (!user) return next(new Error('User not found'));

      socket.data.userId = user._id.toString();
      return next();
    } catch {
      return next(new Error('Unable to authenticate realtime connection'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`);
    socket.on('league:subscribe', async (leagueId, acknowledge) => {
      const respond = typeof acknowledge === 'function' ? acknowledge : () => {};
      if (!leagueId) {
        respond({ ok: false, message: 'Invalid league' });
        return;
      }
      if (!await LeagueModel.isMember(leagueId, socket.data.userId)) {
        respond({ ok: false, message: 'League access denied' });
        return;
      }
      socket.join(`league:${leagueId}`);
      respond({ ok: true });
    });
  });

  await configureRedisAdapter(io);
  return io;
}

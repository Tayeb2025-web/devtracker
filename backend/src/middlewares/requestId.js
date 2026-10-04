import { randomUUID } from 'node:crypto';

export function attachRequestId(req, res, next) {
  req.requestId = randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  next();
}

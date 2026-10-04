export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const isOperational = err.isOperational || err instanceof AppError;
  const databaseUnavailable = ['MongoServerSelectionError', 'MongooseServerSelectionError', 'MongoNetworkError'].includes(err.name)
    || err.message === 'MONGODB_URI is required before the API can access data.';
  const statusCode = isOperational ? err.statusCode || 500
    : err.code === 11000 ? 409
      : ['ValidationError', 'CastError', 'BSONError'].includes(err.name) ? 400
        : databaseUnavailable ? 503 : 500;
  const message = isOperational ? err.message
    : err.code === 11000 ? 'A record with that value already exists'
      : statusCode === 400 ? 'The submitted data is invalid'
        : databaseUnavailable ? 'The data service is temporarily unavailable'
          : 'Internal Server Error';

  console.error(`[Error] ${statusCode} request=${req.requestId || 'unknown'}: ${message}`, err.stack);

  res.status(statusCode).json({
    success: false,
    message,
    requestId: req.requestId || null,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};

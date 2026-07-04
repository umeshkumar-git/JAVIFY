import logger from "../utils/logger.js";

export function errorHandler(err, req, res, _next) {
  logger.error(`${req.method} ${req.path}`, { message: err.message, stack: err.stack });
  const status = err.status || 500;
  res.status(status).json({
    error: err.publicMessage || (status === 500 ? "Internal server error" : err.message),
    code: err.code,
  });
}

export class AppError extends Error {
  constructor(message, status = 500, code = "INTERNAL") {
    super(message);
    this.status = status;
    this.publicMessage = message;
    this.code = code;
  }
}

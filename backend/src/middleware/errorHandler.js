import logger from "../utils/logger.js";

export class AppError extends Error {
	constructor(
		message,
		status = 500,
		code = "INTERNAL_ERROR",
		details = null,
	) {
		super(message);
		this.name = "AppError";
		this.status = status;
		this.statusCode = status;
		this.code = code;
		this.publicMessage = message;
		this.details = details;
	}
}

export function errorHandler(err, req, res, _next) {
	const status = err.status || err.statusCode || 500;
	const code = err.code || "INTERNAL_ERROR";
	const message =
		err.publicMessage ||
		err.message ||
		(status === 500 ? "Internal server error." : "Request failed.");

	let normalizedStatus = status;
	let normalizedCode = code;
	let normalizedMessage = message;

	if (err.name === "ZodError") {
		normalizedStatus = 400;
		normalizedCode = "VALIDATION_ERROR";
		normalizedMessage = "Validation failed.";
	}

	if (err.code === "P2025") {
		normalizedStatus = 404;
		normalizedCode = "NOT_FOUND";
		normalizedMessage = "Requested resource was not found.";
	}

	if (err.code === "P2002") {
		normalizedStatus = 409;
		normalizedCode = "CONFLICT";
		normalizedMessage = "Resource already exists.";
	}

	logger.error("Unhandled request error", {
		module: "errorHandler",
		action: "request.error",
		method: req.method,
		path: req.originalUrl,
		userId: req.user?.sub,
		status: normalizedStatus,
		code: normalizedCode,
		message: normalizedMessage,
		stack: err.stack,
		details: err.details || err.errors || null,
	});

	res.status(normalizedStatus).json({
		success: false,
		data: null,
		error: {
			code: normalizedCode,
			message: normalizedMessage,
		},
		timestamp: new Date().toISOString(),
	});
}

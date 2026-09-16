import winston from "winston";

const formatContext = (context = {}) =>
	Object.fromEntries(
		Object.entries(context).filter(
			([, value]) => value !== undefined && value !== null,
		),
	);

const logger = winston.createLogger({
	level: process.env.LOG_LEVEL ?? "info",
	format: winston.format.combine(
		winston.format.timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSSZ" }),
		winston.format.errors({ stack: true }),
		winston.format.splat(),
		winston.format.json(),
	),
	transports: [new winston.transports.Console()],
});

export function withContext(context = {}) {
	return formatContext(context);
}

export default logger;

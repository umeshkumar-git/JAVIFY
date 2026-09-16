import { AppError } from "./errorHandler.js";

export function validate(schema) {
	return (req, _res, next) => {
		const result = schema.safeParse(req.body);
		if (!result.success) {
			return next(
				new AppError(
					"Validation failed.",
					400,
					"VALIDATION_ERROR",
					result.error.flatten(),
				),
			);
		}

		req.body = result.data;
		next();
	};
}

export function successResponse(data) {
	return {
		success: true,
		data,
		error: null,
		timestamp: new Date().toISOString(),
	};
}

export function errorResponse(code, message, data = null) {
	return {
		success: false,
		data,
		error: {
			code,
			message,
		},
		timestamp: new Date().toISOString(),
	};
}

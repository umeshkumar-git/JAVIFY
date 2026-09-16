export function toPublicUserDto(user) {
	if (!user) return null;
	const { password: _password, ...safeUser } = user;
	return safeUser;
}

export function toAuthSessionDto({ user, accessToken, refreshToken }) {
	return {
		user: toPublicUserDto(user),
		accessToken,
		refreshToken,
	};
}

export function toOtpResponseDto({ expiresAt, cooldownUntil }) {
	return {
		expiresAt: expiresAt.getTime(),
		cooldownUntil: cooldownUntil.getTime
			? cooldownUntil.getTime()
			: cooldownUntil,
		message: "Verification code sent to your email.",
	};
}

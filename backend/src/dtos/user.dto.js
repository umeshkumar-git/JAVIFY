export function toPublicUserDto(user) {
	if (!user) return null;
	const { password: _password, ...safeUser } = user;
	return safeUser;
}

export function toUserProgressDto({
	user,
	completedChallengeIds,
	totalSubmissions,
}) {
	return {
		user: toPublicUserDto(user),
		completedChallengeIds,
		totalSubmissions,
	};
}

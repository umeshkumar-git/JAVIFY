export function toPublicChallengeDto(challenge) {
	if (!challenge) return null;
	const { hiddenTestCases: _hiddenTestCases, ...publicChallenge } = challenge;
	return publicChallenge;
}

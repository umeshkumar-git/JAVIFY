import { prisma } from "../utils/prisma.js";

export const authRepository = {
	async findUserByEmail(email) {
		return prisma.user.findUnique({ where: { email } });
	},

	async findUserById(id) {
		return prisma.user.findUnique({ where: { id } });
	},

	async createUser(data) {
		return prisma.user.create({ data });
	},

	async createSession(data) {
		return prisma.session.create({ data });
	},

	async findSessionByRefreshToken(refreshToken) {
		return prisma.session.findUnique({ where: { refreshToken } });
	},

	async deleteSessionsByRefreshToken(refreshToken) {
		return prisma.session.deleteMany({ where: { refreshToken } });
	},

	async invalidateOtpRequests(email, purpose) {
		return prisma.otpCode.updateMany({
			where: { email, purpose, consumed: false },
			data: { consumed: true },
		});
	},

	async createOtp(data) {
		return prisma.otpCode.create({ data });
	},

	async findLatestOtp(email, purpose) {
		return prisma.otpCode.findFirst({
			where: { email, purpose, consumed: false },
			orderBy: { createdAt: "desc" },
		});
	},

	async markOtpConsumed(id, updates = {}) {
		return prisma.otpCode.update({
			where: { id },
			data: { consumed: true, ...updates },
		});
	},

	async updateOtp(id, data) {
		return prisma.otpCode.update({ where: { id }, data });
	},
};

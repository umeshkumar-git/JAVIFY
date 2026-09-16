import { prisma } from "../utils/prisma.js";

export const userRepository = {
	async findById(id) {
		return prisma.user.findUnique({ where: { id } });
	},

	async updateById(id, data) {
		return prisma.user.update({ where: { id }, data });
	},

	async findProgress(userId) {
		return Promise.all([
			prisma.user.findUnique({ where: { id: userId } }),
			prisma.submission.findMany({
				where: { userId, result: "PASSED" },
				select: { challengeId: true },
				distinct: ["challengeId"],
			}),
			prisma.submission.count({ where: { userId } }),
		]);
	},

	async findAll() {
		return prisma.user.findMany({
			orderBy: { xp: "desc" },
			take: 100,
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				xp: true,
				level: true,
				coins: true,
				streak: true,
				createdAt: true,
			},
		});
	},
};

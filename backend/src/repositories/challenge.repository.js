import { prisma } from "../utils/prisma.js";

export const challengeRepository = {
	async findAll() {
		return prisma.challenge.findMany({
			orderBy: { createdAt: "asc" },
			select: {
				id: true,
				title: true,
				description: true,
				difficulty: true,
				category: true,
				xpReward: true,
				coinsReward: true,
				visibleTestCases: true,
				constraints: true,
				memoryLimit: true,
				timeLimit: true,
				starterCode: true,
				worldId: true,
			},
		});
	},

	async findById(id) {
		return prisma.challenge.findUnique({ where: { id } });
	},

	async create(data) {
		return prisma.challenge.create({ data });
	},

	async update(id, data) {
		return prisma.challenge.update({ where: { id }, data });
	},

	async delete(id) {
		return prisma.challenge.delete({ where: { id } });
	},
};

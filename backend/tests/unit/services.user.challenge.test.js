import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/utils/cache.js", () => ({
  withCache: vi.fn(async (_key, _ttl, loader) => loader()),
  invalidateCachePattern: vi.fn(async () => true),
}));

vi.mock("../../src/repositories/challenge.repository.js", () => ({
  challengeRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../../src/repositories/user.repository.js", () => ({
  userRepository: {
    findById: vi.fn(),
    updateById: vi.fn(),
    findProgress: vi.fn(),
    findAll: vi.fn(),
  },
}));

vi.mock("../../src/utils/logger.js", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { challengeRepository } from "../../src/repositories/challenge.repository.js";
import { userRepository } from "../../src/repositories/user.repository.js";
import {
  createChallenge,
  deleteChallenge,
  getChallengeById,
  listChallenges,
  updateChallenge,
} from "../../src/services/challenge.service.js";
import {
  getCurrentUser,
  getUserProgress,
  listUsers,
  updateCurrentUser,
} from "../../src/services/user.service.js";
import { invalidateCachePattern, withCache } from "../../src/utils/cache.js";

describe("service layer behaviors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists challenges through the cache-aside layer", async () => {
    challengeRepository.findAll.mockResolvedValue([
      { id: "c1", title: "Array Basics", hiddenTestCases: ["secret"] },
    ]);

    const challenges = await listChallenges();

    expect(withCache).toHaveBeenCalledWith(
      "challenge:list",
      300,
      expect.any(Function),
      expect.objectContaining({ domain: "challenge" }),
    );
    expect(challenges).toEqual([
      expect.objectContaining({ id: "c1", title: "Array Basics" }),
    ]);
  });

  it("throws when a challenge cannot be found by id", async () => {
    challengeRepository.findById.mockResolvedValue(null);

    await expect(getChallengeById("missing")).rejects.toMatchObject({
      code: "CHALLENGE_NOT_FOUND",
      status: 404,
    });
  });

  it("creates, updates, and deletes challenges while invalidating challenge cache", async () => {
    challengeRepository.create.mockResolvedValue({ id: "c2", title: "Loops" });
    challengeRepository.update.mockResolvedValue({ id: "c2", title: "Updated" });

    const created = await createChallenge({ title: "Loops" });
    const updated = await updateChallenge("c2", { title: "Updated" });
    const deleted = await deleteChallenge("c2");

    expect(created).toEqual(expect.objectContaining({ id: "c2", title: "Loops" }));
    expect(updated).toEqual(expect.objectContaining({ id: "c2", title: "Updated" }));
    expect(deleted).toEqual({ ok: true });
    expect(invalidateCachePattern).toHaveBeenCalledWith("challenge:*");
  });

  it("fetches the current user profile from cache and maps the public DTO", async () => {
    userRepository.findById.mockResolvedValue({
      id: "u-1",
      name: "Alice",
      email: "alice@example.com",
      password: "hashed",
      role: "STUDENT",
    });

    const user = await getCurrentUser("u-1");

    expect(withCache).toHaveBeenCalledWith(
      "user:profile:u-1",
      180,
      expect.any(Function),
      expect.objectContaining({ domain: "user" }),
    );
    expect(user).toMatchObject({ id: "u-1", name: "Alice", email: "alice@example.com" });
    expect(user.password).toBeUndefined();
  });

  it("throws a not-found error when the current user is missing", async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(getCurrentUser("missing")).rejects.toMatchObject({
      code: "USER_NOT_FOUND",
      status: 404,
    });
  });

  it("updates the profile and invalidates user cache keys", async () => {
    userRepository.updateById.mockResolvedValue({
      id: "u-1",
      name: "Alice Updated",
      email: "alice@example.com",
      avatar: "avatar.png",
    });

    const result = await updateCurrentUser("u-1", { name: "Alice Updated", avatar: "avatar.png" });

    expect(result).toMatchObject({ id: "u-1", name: "Alice Updated" });
    expect(invalidateCachePattern).toHaveBeenCalledWith("user:profile:u-1");
    expect(invalidateCachePattern).toHaveBeenCalledWith("user:progress:u-1");
    expect(invalidateCachePattern).toHaveBeenCalledWith("user:list");
  });

  it("collects a user's progress as a flattened DTO", async () => {
    userRepository.findProgress.mockResolvedValue([
      { id: "u-1", name: "Alice", email: "alice@example.com" },
      [{ challengeId: "c1" }, { challengeId: "c2" }],
      3,
    ]);

    const progress = await getUserProgress("u-1");

    expect(progress).toMatchObject({
      completedChallengeIds: ["c1", "c2"],
      totalSubmissions: 3,
      user: { id: "u-1", email: "alice@example.com" },
    });
  });

  it("lists users through the shared caching wrapper", async () => {
    userRepository.findAll.mockResolvedValue([
      { id: "u-1", name: "Alice", email: "alice@example.com", password: "hashed" },
    ]);

    const users = await listUsers();

    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ id: "u-1", email: "alice@example.com" });
    expect(withCache).toHaveBeenCalledWith("user:list", 180, expect.any(Function), expect.objectContaining({ domain: "user" }));
  });
});

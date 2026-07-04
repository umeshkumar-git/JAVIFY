import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { challenges, getChallengeById, worlds } from "../data/javify";
import { recordActivity } from "../services/analytics";
import { resolveRole, type Role } from "../features/auth/roles";

const XP_PER_LEVEL = 250;

function calculateLevel(xp: number) {
  return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
}

function resolveActiveWorld(completedChallengeIds: string[]) {
  const nextWorld = worlds.find((world) =>
    world.challengeIds.some((challengeId) => !completedChallengeIds.includes(challengeId))
  );

  return nextWorld?.id ?? worlds[worlds.length - 1]?.id ?? "forest-variables";
}

interface JavifyStore {
  isAuthenticated: boolean;
  username: string;
  email: string;
  role: Role;
  xp: number;
  level: number;
  coins: number;
  streak: number;
  runCount: number;
  failedRuns: number;
  totalSubmissions: number;
  completedChallengeIds: string[];
  hintedChallengeIds: string[];
  activeWorldId: string;
  twoFactorPending: boolean;
  verificationEmail: string;
  verificationExpiresAt: number;
  emailVerified: boolean;
  emailVerifiedAt: number | null;
  register: (username: string, email: string) => void;
  login: (identity: string) => void;
  logout: () => void;
  recordRun: (success: boolean) => void;
  useHint: (challengeId: string) => void;
  completeChallenge: (challengeId: string) => void;
  resetProgress: () => void;
  setVerificationPending: (email: string, expiresAt: number) => void;
  markEmailVerified: (email: string) => void;
  cancelVerification: () => void;
}

const initialState = {
  isAuthenticated: false,
  username: "Java Apprentice",
  email: "apprentice@javify.dev",
  role: "user" as Role,
  xp: 90,
  level: 1,
  coins: 140,
  streak: 5,
  runCount: 0,
  failedRuns: 0,
  totalSubmissions: 0,
  completedChallengeIds: [] as string[],
  hintedChallengeIds: [] as string[],
  activeWorldId: "forest-variables",
  twoFactorPending: false,
  verificationEmail: "",
  verificationExpiresAt: 0,
  emailVerified: false,
  emailVerifiedAt: null as number | null,
};

export const useJavifyStore = create<JavifyStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      register: (username, email) => {
        // Role is resolved via permissions module — no fragile string matching.
        const role: Role = resolveRole(email);
        set({
          isAuthenticated: true,
          username,
          email,
          role,
          emailVerified: true,
          emailVerifiedAt: Date.now(),
          xp: Math.max(get().xp, 90),
          level: calculateLevel(Math.max(get().xp, 90)),
        });
        recordActivity(username, "register", "Account created and verified");
      },
      login: (identity) => {
        const safeName = identity.includes("@") ? identity.split("@")[0] : identity;
        const role: Role = identity.includes("@") ? resolveRole(identity) : get().role;
        const finalName = safeName || get().username;
        set({
          isAuthenticated: true,
          username: finalName,
          role,
          emailVerified: identity.includes("@") ? true : get().emailVerified,
          emailVerifiedAt: identity.includes("@") ? Date.now() : get().emailVerifiedAt,
        });
        recordActivity(finalName, "login", "Authenticated via login form");
      },
      logout: () => {
        set({ isAuthenticated: false });
      },
      recordRun: (success) => {
        set((state) => ({
          runCount: state.runCount + 1,
          failedRuns: success ? state.failedRuns : state.failedRuns + 1,
        }));
      },
      useHint: (challengeId) => {
        set((state) => ({
          hintedChallengeIds: state.hintedChallengeIds.includes(challengeId)
            ? state.hintedChallengeIds
            : [...state.hintedChallengeIds, challengeId],
        }));
      },
      completeChallenge: (challengeId) => {
        const existing = get().completedChallengeIds;
        if (existing.includes(challengeId)) {
          set((state) => ({ totalSubmissions: state.totalSubmissions + 1 }));
          return;
        }

        const challenge = getChallengeById(challengeId);
        if (!challenge) {
          return;
        }

        const completedChallengeIds = [...existing, challengeId];
        const xp = get().xp + challenge.xpReward;
        const coins = get().coins + challenge.coinsReward;

        set((state) => ({
          xp,
          level: calculateLevel(xp),
          coins,
          totalSubmissions: state.totalSubmissions + 1,
          completedChallengeIds,
          activeWorldId: resolveActiveWorld(completedChallengeIds),
          streak: Math.min(state.streak + 1, 99),
        }));
      },
      resetProgress: () => {
        set({
          ...initialState,
          isAuthenticated: get().isAuthenticated,
          username: get().username,
          email: get().email,
          role: get().role,
        });
      },
      setVerificationPending: (email, expiresAt) => {
        set({
          twoFactorPending: true,
          verificationEmail: email,
          verificationExpiresAt: expiresAt,
        });
      },
      markEmailVerified: (email) => {
        set({
          twoFactorPending: false,
          verificationEmail: "",
          verificationExpiresAt: 0,
          emailVerified: true,
          emailVerifiedAt: Date.now(),
          email,
        });
      },
      cancelVerification: () => {
        set({
          twoFactorPending: false,
          verificationEmail: "",
          verificationExpiresAt: 0,
        });
      },
    }),
    {
      name: "javify-state",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        username: state.username,
        email: state.email,
        role: state.role,
        emailVerified: state.emailVerified,
        emailVerifiedAt: state.emailVerifiedAt,
        xp: state.xp,
        level: state.level,
        coins: state.coins,
        streak: state.streak,
        runCount: state.runCount,
        failedRuns: state.failedRuns,
        totalSubmissions: state.totalSubmissions,
        completedChallengeIds: state.completedChallengeIds,
        hintedChallengeIds: state.hintedChallengeIds,
        activeWorldId: state.activeWorldId,
      }),
    }
  )
);

export function getCompletionPercentage(completedChallengeIds: string[]) {
  if (challenges.length === 0) {
    return 0;
  }

  return Math.round((completedChallengeIds.length / challenges.length) * 100);
}

export function getXpToNextLevel(xp: number) {
  const currentLevelBase = Math.floor(xp / XP_PER_LEVEL) * XP_PER_LEVEL;
  return XP_PER_LEVEL - (xp - currentLevelBase);
}

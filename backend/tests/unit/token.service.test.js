import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";

import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../src/services/token.service.js";

describe("token.service", () => {
  it("creates and verifies access and refresh JWTs", () => {
    const user = {
      id: "user-1",
      email: "alice@example.com",
      role: "ADMIN",
      name: "Alice",
    };

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    expect(jwt.decode(accessToken)).toMatchObject({
      sub: "user-1",
      email: "alice@example.com",
      role: "ADMIN",
    });
    expect(verifyRefreshToken(refreshToken)).toMatchObject({ sub: "user-1" });
  });
});

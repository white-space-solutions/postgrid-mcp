import { beforeEach, describe, expect, it } from "vitest";
import {
  issueAuthCode,
  verifyAuthCode,
  issueAccessToken,
  verifyAccessToken,
  issueRefreshToken,
  verifyRefreshToken,
  verifyPkce,
} from "./tokens";
import { sha256Base64Url } from "@/lib/crypto";

beforeEach(() => {
  process.env.OAUTH_TOKEN_SECRET =
    "test-secret-at-least-32-characters-long!!";
  process.env.PUBLIC_BASE_URL = "https://example.test";
});

describe("oauth tokens", () => {
  it("issues and verifies auth codes with PKCE", () => {
    const verifier = "abcdefghijklmnopqrstuvwxyz0123456789~-._";
    const challenge = sha256Base64Url(verifier);
    const code = issueAuthCode({
      sub: "operator",
      clientId: "https://claude.ai/oauth/client",
      redirectUri: "https://claude.ai/api/mcp/auth_callback",
      codeChallenge: challenge,
    });
    const payload = verifyAuthCode(code);
    expect(payload?.sub).toBe("operator");
    expect(verifyPkce(verifier, payload!.code_challenge)).toBe(true);
    expect(verifyPkce("wrong", payload!.code_challenge)).toBe(false);
  });

  it("binds access tokens to audience", () => {
    const { token } = issueAccessToken({
      sub: "operator",
      clientId: "client",
      audience: "https://example.test/api/mcp",
    });
    expect(
      verifyAccessToken(token, "https://example.test/api/mcp")?.sub
    ).toBe("operator");
    expect(verifyAccessToken(token, "https://other.test/api/mcp")).toBeNull();
  });

  it("issues refresh tokens", () => {
    const refresh = issueRefreshToken({
      sub: "operator",
      clientId: "client",
      audience: "https://example.test/api/mcp",
    });
    const payload = verifyRefreshToken(refresh);
    expect(payload?.typ).toBe("refresh");
    expect(payload?.jti).toBeTruthy();
  });
});

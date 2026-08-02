import { describe, expect, it } from "vitest";
import { assertAllowedHost, HostNotAllowedError } from "./env";

describe("host allowlist", () => {
  it("allows listed hosts", () => {
    process.env.MCP_ALLOWED_HOSTS = "example.test,localhost:3000";
    const req = new Request("https://example.test/api/mcp", {
      headers: { host: "example.test" },
    });
    expect(() => assertAllowedHost(req)).not.toThrow();
  });

  it("rejects unknown hosts", () => {
    process.env.MCP_ALLOWED_HOSTS = "example.test";
    const req = new Request("https://evil.test/api/mcp", {
      headers: { host: "evil.test" },
    });
    expect(() => assertAllowedHost(req)).toThrow(HostNotAllowedError);
  });
});

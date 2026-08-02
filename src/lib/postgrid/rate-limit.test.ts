import { beforeEach, describe, expect, it } from "vitest";
import {
  acquireListPermit,
  RateLimitedError,
  resetMemoryRateLimit,
} from "./rate-limit";

beforeEach(() => {
  resetMemoryRateLimit();
});

describe("memory rate limit", () => {
  it("allows 10 then throws", async () => {
    for (let i = 0; i < 10; i++) {
      await acquireListPermit();
    }
    await expect(acquireListPermit()).rejects.toBeInstanceOf(RateLimitedError);
  });
});

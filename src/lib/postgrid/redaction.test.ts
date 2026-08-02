import { describe, expect, it } from "vitest";
import { redactSensitive } from "./redaction";

describe("redactSensitive", () => {
  it("redacts signed URLs and html", () => {
    const out = redactSensitive({
      id: "letter_1",
      url: "https://cdn.example.com/file.pdf?X-Amz-Signature=abc",
      html: "<p>secret</p>",
      nested: { previewUrl: "https://x.test/a?token=1" },
      size: "letter",
    }) as Record<string, unknown>;

    expect(out.id).toBe("letter_1");
    expect(out.size).toBe("letter");
    expect(out.url).toBe("[redacted-url]");
    expect(out.html).toBe("[redacted]");
    expect((out.nested as Record<string, unknown>).previewUrl).toBe(
      "[redacted-url]"
    );
  });
});

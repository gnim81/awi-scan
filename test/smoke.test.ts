import { describe, expect, it } from "vitest";
import { version } from "../src/index.js";

describe("public exports", () => {
  it("exposes a package version string", () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });
});

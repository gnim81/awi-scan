import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { scan } from "../src/analyzer.js";
import { defaultConfig } from "../src/config.js";

describe("example fixtures", () => {
  it("flags vulnerable fixtures", async () => {
    const result = await scan({
      root: resolve("."),
      paths: ["examples/vulnerable"],
      config: defaultConfig
    });
    expect(result.findings.some((finding) => finding.severity === "critical" || finding.severity === "high")).toBe(true);
  });

  it("does not flag safe fixtures as high or critical", async () => {
    const result = await scan({
      root: resolve("."),
      paths: ["examples/safe"],
      config: defaultConfig
    });
    expect(result.findings.filter((finding) => finding.severity === "critical" || finding.severity === "high")).toHaveLength(0);
  });
});

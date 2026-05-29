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

  it("flags untrusted pull request head checkout before an agent runs", async () => {
    const result = await scan({
      root: resolve("."),
      paths: ["examples/vulnerable/pull-request-target-checkout-agent.yml"],
      config: defaultConfig
    });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.ruleId).toBe("awi.untrusted-checkout-to-agent");
    expect(result.findings[0]?.severity).toBe("critical");
  });

  it("flags Gemini CLI when untrusted issue text reaches a privileged agent", async () => {
    const result = await scan({
      root: resolve("."),
      paths: ["examples/vulnerable/gemini-issue-agent.yml"],
      config: defaultConfig
    });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.ruleId).toBe("awi.untrusted-prompt-to-agent");
    expect(result.findings[0]?.evidence.map((evidence) => evidence.label)).toContain("agent CLI");
  });

  it("flags Aider CLI when untrusted pull request text reaches a privileged agent", async () => {
    const result = await scan({
      root: resolve("."),
      paths: ["examples/vulnerable/aider-pull-request-agent.yml"],
      config: defaultConfig
    });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.ruleId).toBe("awi.untrusted-prompt-to-agent");
    expect(result.findings[0]?.evidence.map((evidence) => evidence.label)).toContain("agent CLI");
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

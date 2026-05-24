import { describe, expect, it } from "vitest";
import { renderHuman, renderJson, renderSarif } from "../src/reporters/index.js";
import type { ScanResult } from "../src/analyzer.js";

const result: ScanResult = {
  scannedFiles: [".github/workflows/danger.yml"],
  findings: [
    {
      ruleId: "awi.untrusted-prompt-to-agent",
      title: "Untrusted GitHub event content reaches an agent prompt",
      severity: "critical",
      confidence: "high",
      location: { file: ".github/workflows/danger.yml", line: 10, column: 1 },
      evidence: [],
      message: "Untrusted GitHub event content can reach an AI agent running with workflow privileges.",
      remediation: "Gate agent execution on trusted approval.",
      references: ["https://arxiv.org/abs/2605.07135"]
    }
  ]
};

describe("reporters", () => {
  it("renders a readable human report", () => {
    expect(renderHuman(result, false)).toContain("critical");
    expect(renderHuman(result, false)).toContain("awi.untrusted-prompt-to-agent");
  });

  it("renders JSON", () => {
    expect(JSON.parse(renderJson(result)).findings[0].severity).toBe("critical");
  });

  it("renders SARIF", () => {
    const sarif = JSON.parse(renderSarif(result));
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs[0].results[0].ruleId).toBe("awi.untrusted-prompt-to-agent");
  });
});

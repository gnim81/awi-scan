import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { scan } from "../src/analyzer.js";
import { defaultConfig } from "../src/config.js";

describe("analyzer", () => {
  it("reports critical AWI when PR body reaches an agent in pull_request_target with write permission", async () => {
    const root = await mkdtemp(join(tmpdir(), "awi-analyzer-"));
    await mkdir(join(root, ".github", "workflows"), { recursive: true });
    await writeFile(
      join(root, ".github", "workflows", "danger.yml"),
      [
        "name: danger",
        "on:",
        "  pull_request_target:",
        "permissions:",
        "  contents: write",
        "jobs:",
        "  agent:",
        "    runs-on: ubuntu-latest",
        "    steps:",
        "      - uses: anthropics/claude-code-action@v1",
        "        with:",
        "          prompt: ${{ github.event.pull_request.body }}"
      ].join("\n")
    );

    const result = await scan({ root, paths: ["."], config: defaultConfig });
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.severity).toBe("critical");
    expect(result.findings[0]?.ruleId).toBe("awi.untrusted-prompt-to-agent");
  });

  it("does not report high findings when no source reaches an agent", async () => {
    const root = await mkdtemp(join(tmpdir(), "awi-analyzer-safe-"));
    await mkdir(join(root, ".github", "workflows"), { recursive: true });
    await writeFile(
      join(root, ".github", "workflows", "safe.yml"),
      [
        "name: safe",
        "on: workflow_dispatch",
        "permissions:",
        "  contents: read",
        "jobs:",
        "  agent:",
        "    runs-on: ubuntu-latest",
        "    steps:",
        "      - uses: anthropics/claude-code-action@v1",
        "        with:",
        "          prompt: Summarize trusted release notes"
      ].join("\n")
    );

    const result = await scan({ root, paths: ["."], config: defaultConfig });
    expect(result.findings.filter((finding) => finding.severity === "high" || finding.severity === "critical")).toHaveLength(0);
  });
});

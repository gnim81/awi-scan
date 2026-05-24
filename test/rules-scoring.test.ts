import { describe, expect, it } from "vitest";
import { classifySeverity } from "../src/scoring.js";
import { detectPrivileges, detectSinks, detectSources } from "../src/rules/matchers.js";
import type { Workflow } from "../src/types.js";

const workflow: Workflow = {
  file: ".github/workflows/agent.yml",
  name: "agent",
  triggers: ["pull_request_target"],
  permissions: { contents: "write" },
  env: {},
  jobs: [
    {
      id: "triage",
      runsOn: ["ubuntu-latest"],
      permissions: {},
      env: {},
      location: { file: ".github/workflows/agent.yml", line: 1, column: 1 },
      steps: [
        {
          name: "Ask agent",
          uses: "anthropics/claude-code-action@v1",
          with: { prompt: "${{ github.event.pull_request.body }}" },
          env: { GH_TOKEN: "${{ secrets.GITHUB_TOKEN }}" },
          location: { file: ".github/workflows/agent.yml", line: 8, column: 1 }
        }
      ]
    }
  ]
};

describe("rules and scoring", () => {
  it("detects event body sources", () => {
    const sources = detectSources(workflow);
    expect(sources.map((source) => source.label)).toContain("github.event.pull_request.body");
  });

  it("detects agent sinks", () => {
    const sinks = detectSinks(workflow, []);
    expect(sinks.map((sink) => sink.label)).toContain("anthropics/claude-code-action@v1");
  });

  it("detects privilege amplifiers", () => {
    const privileges = detectPrivileges(workflow);
    expect(privileges.map((privilege) => privilege.label)).toContain("pull_request_target");
    expect(privileges.map((privilege) => privilege.label)).toContain("contents: write");
    expect(privileges.map((privilege) => privilege.label)).toContain("secrets in agent step");
  });

  it("scores privileged agent flow as critical", () => {
    expect(
      classifySeverity({
        hasCompleteFlow: true,
        hasPullRequestTarget: true,
        hasWritePermission: true,
        hasSecrets: true,
        hasSelfHostedRunner: false
      })
    ).toEqual({ severity: "critical", confidence: "high" });
  });
});

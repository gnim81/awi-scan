import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { defaultConfig } from "../src/config.js";
import { discoverWorkflowFiles } from "../src/discovery.js";
import { parseWorkflowFile } from "../src/parser.js";

describe("workflow discovery and parsing", () => {
  it("finds workflow yaml files under .github/workflows", async () => {
    const root = await mkdtemp(join(tmpdir(), "awi-discovery-"));
    await mkdir(join(root, ".github", "workflows"), { recursive: true });
    await writeFile(join(root, ".github", "workflows", "agent.yml"), "name: agent\non: issue_comment\njobs: {}\n");
    await writeFile(join(root, ".github", "workflows", "notes.txt"), "ignore me");

    await expect(discoverWorkflowFiles(root, ["."], defaultConfig)).resolves.toEqual([
      join(root, ".github", "workflows", "agent.yml")
    ]);
  });

  it("does not add .github workflows when scanning a specific directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "awi-discovery-path-"));
    await mkdir(join(root, ".github", "workflows"), { recursive: true });
    await mkdir(join(root, "examples"), { recursive: true });
    await writeFile(join(root, ".github", "workflows", "ci.yml"), "name: ci\non: push\njobs: {}\n");
    await writeFile(join(root, "examples", "agent.yml"), "name: agent\non: issue_comment\njobs: {}\n");

    await expect(discoverWorkflowFiles(root, ["examples"], defaultConfig)).resolves.toEqual([join(root, "examples", "agent.yml")]);
  });

  it("parses jobs, steps, permissions, and triggers", async () => {
    const root = await mkdtemp(join(tmpdir(), "awi-parser-"));
    const file = join(root, "workflow.yml");
    await writeFile(
      file,
      [
        "name: agent",
        "on:",
        "  pull_request_target:",
        "permissions:",
        "  contents: write",
        "jobs:",
        "  triage:",
        "    runs-on: ubuntu-latest",
        "    steps:",
        "      - name: Ask agent",
        "        uses: anthropics/claude-code-action@v1",
        "        with:",
        "          prompt: ${{ github.event.pull_request.body }}"
      ].join("\n")
    );

    const workflow = await parseWorkflowFile(file, root);
    expect(workflow.triggers).toContain("pull_request_target");
    expect(workflow.permissions["contents"]).toBe("write");
    expect(workflow.jobs).toHaveLength(1);
    expect(workflow.jobs[0]?.steps[0]?.uses).toBe("anthropics/claude-code-action@v1");
    expect(workflow.jobs[0]?.steps[0]?.with.prompt).toContain("github.event.pull_request.body");
  });

  it("treats on as a GitHub Actions trigger key instead of a boolean", async () => {
    const root = await mkdtemp(join(tmpdir(), "awi-parser-on-"));
    const file = join(root, "workflow.yml");
    await writeFile(file, "name: simple\non: pull_request\njobs: {}\n");

    const workflow = await parseWorkflowFile(file, root);
    expect(workflow.triggers).toEqual(["pull_request"]);
  });
});

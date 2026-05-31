import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("release assets", () => {
  it("does not ignore the GitHub Action runtime bundle", async () => {
    const gitignore = await readFile(".gitignore", "utf8");
    expect(gitignore).toContain("!dist/action.js");
  });

  it("builds action runtime as a single file without local chunk imports", async () => {
    const action = await readFile("dist/action.js", "utf8");
    expect(action).not.toMatch(/from "\.\/chunk-/);
  });

  it("uses the actual GitHub repository owner in release metadata", async () => {
    const files = await Promise.all([
      readFile("README.md", "utf8"),
      readFile("package.json", "utf8"),
      readFile("src/reporters/sarif.ts", "utf8")
    ]);

    expect(files.join("\n")).toContain("gnim81/awi-scan");
    expect(files.join("\n")).not.toContain("vanesio/awi-scan");
    expect(files.join("\n")).not.toContain("gnep18/awi-scan");
  });

  it("ships public security and contribution guidance", async () => {
    const files = await Promise.all([
      readFile("SECURITY.md", "utf8"),
      readFile("CONTRIBUTING.md", "utf8"),
      readFile("docs/agent-actions.md", "utf8"),
      readFile("docs/false-positives.md", "utf8"),
      readFile("docs/sarif-upload.md", "utf8")
    ]);

    expect(files.join("\n")).toContain("Agentic Workflow Injection");
    expect(files.join("\n")).toContain("npm run check");
    expect(files.join("\n")).toContain("Claude Code");
    expect(files.join("\n")).toContain("false positive");
    expect(files.join("\n")).toContain("github/codeql-action/upload-sarif");
  });

  it("includes linked public documentation in the npm package without internal docs", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as { files: string[] };

    expect(packageJson.files).toEqual(
      expect.arrayContaining([
        "docs/configuration.md",
        "docs/examples.md",
        "docs/releasing.md",
        "docs/rules.md",
        "docs/threat-model.md",
        "docs/agent-actions.md",
        "docs/false-positives.md",
        "docs/sarif-upload.md",
        "SECURITY.md",
        "CONTRIBUTING.md"
      ])
    );
    expect(packageJson.files).not.toContain("docs");
    expect(packageJson.files.join("\n")).not.toContain("docs/superpowers");
  });

  it("points public usage examples at the next launch-ready release", async () => {
    const readme = await readFile("README.md", "utf8");
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as { version: string };

    expect(packageJson.version).toBe("0.2.0");
    expect(readme).toContain("gnim81/awi-scan@v0.2.0");
    expect(readme).toContain("npx awi-scan --format human");
    expect(readme).not.toContain("not yet published to npm");
  });

  it("uses npm-normalized package metadata for publishing", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      repository: { url: string };
      bin: Record<string, string>;
    };

    expect(packageJson.repository.url).toBe("git+https://github.com/gnim81/awi-scan.git");
    expect(packageJson.bin["awi-scan"]).toBe("dist/cli.js");
  });

  it("keeps README and terminal demo example counts in sync with fixtures", async () => {
    const files = await Promise.all([
      readFile("README.md", "utf8"),
      readFile("docs/assets/terminal-demo.svg", "utf8")
    ]);

    for (const file of files) {
      expect(file).toContain("5 finding(s)");
      expect(file).toContain("9 workflow file(s)");
      expect(file).not.toContain("3 finding(s)");
      expect(file).not.toContain("5 workflow file(s)");
    }
  });
});

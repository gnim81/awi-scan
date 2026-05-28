import { execFile } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import packageJson from "../package.json" with { type: "json" };
import { beforeAll, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("cli", () => {
  beforeAll(async () => {
    await execFileAsync(process.execPath, ["node_modules/tsup/dist/cli-default.js"]);
  }, 120000);

  it("prints version", async () => {
    const { stdout } = await execFileAsync("node", ["dist/cli.js", "--version"]);
    expect(stdout).toContain(packageJson.version);
  });

  it("returns exit code 1 when fail threshold is met", async () => {
    const root = await mkdtemp(join(tmpdir(), "awi-cli-"));
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

    await expect(execFileAsync("node", [join(process.cwd(), "dist", "cli.js"), "--format", "json"], { cwd: root })).rejects.toMatchObject({
      code: 1
    });
  }, 120000);
});

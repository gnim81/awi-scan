import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { getInput, getMultilineInput, setFailed, setOutput } from "../src/github-action-io.js";

describe("github action io", () => {
  it("reads scalar and multiline inputs from GitHub Action environment variables", () => {
    const env = {
      INPUT_FORMAT: "sarif",
      INPUT_PATHS: "examples/vulnerable\nexamples/safe"
    };

    expect(getInput("format", env)).toBe("sarif");
    expect(getMultilineInput("paths", env)).toEqual(["examples/vulnerable", "examples/safe"]);
  });

  it("emits legacy GitHub output and failure commands when output file is unavailable", () => {
    const lines: string[] = [];
    setOutput("report", "awi-scan.sarif", (line) => lines.push(line), {});
    setFailed("boom", (line) => lines.push(line));

    expect(lines).toEqual(["::set-output name=report::awi-scan.sarif", "::error::boom"]);
  });

  it("writes outputs to GITHUB_OUTPUT when available", async () => {
    const dir = await mkdtemp(join(tmpdir(), "awi-output-"));
    const outputFile = join(dir, "output.txt");

    setOutput("report", "awi-scan.sarif", () => undefined, { GITHUB_OUTPUT: outputFile });

    await expect(readFile(outputFile, "utf8")).resolves.toBe("report=awi-scan.sarif\n");
  });
});

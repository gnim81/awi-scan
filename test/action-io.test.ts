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

  it("emits GitHub output and failure commands", () => {
    const lines: string[] = [];
    setOutput("report", "awi-scan.sarif", (line) => lines.push(line));
    setFailed("boom", (line) => lines.push(line));

    expect(lines).toEqual(["::set-output name=report::awi-scan.sarif", "::error::boom"]);
  });
});

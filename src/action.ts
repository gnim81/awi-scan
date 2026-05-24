import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { scan } from "./analyzer.js";
import { loadConfig } from "./config.js";
import { getInput, getMultilineInput, setFailed, setOutput } from "./github-action-io.js";
import { renderReport } from "./reporters/index.js";
import { meetsThreshold } from "./scoring.js";
import type { FailThreshold, OutputFormat } from "./types.js";

async function run(): Promise<void> {
  const root = process.cwd();
  const paths = getMultilineInput("paths");
  const format = (getInput("format") || "sarif") as OutputFormat;
  const failOn = (getInput("fail-on") || "high") as FailThreshold;
  const output = getInput("output") || "awi-scan.sarif";
  const config = await loadConfig(root);
  const result = await scan({ root, paths: paths.length > 0 ? paths : ["."], config: { ...config, failOn } });
  const report = renderReport(result, format, false);
  await writeFile(resolve(output), report);
  setOutput("report", output);

  if (result.findings.some((finding) => meetsThreshold(finding.severity, failOn))) {
    setFailed(`awi-scan found ${result.findings.length} finding(s) at or above ${failOn}`);
  }
}

run().catch((error) => setFailed((error as Error).message));

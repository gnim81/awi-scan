import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as core from "@actions/core";
import { scan } from "./analyzer.js";
import { loadConfig } from "./config.js";
import { renderReport } from "./reporters/index.js";
import { meetsThreshold } from "./scoring.js";
import type { FailThreshold, OutputFormat } from "./types.js";

async function run(): Promise<void> {
  const root = process.cwd();
  const paths = core.getMultilineInput("paths");
  const format = (core.getInput("format") || "sarif") as OutputFormat;
  const failOn = (core.getInput("fail-on") || "high") as FailThreshold;
  const output = core.getInput("output") || "awi-scan.sarif";
  const config = await loadConfig(root);
  const result = await scan({ root, paths: paths.length > 0 ? paths : ["."], config: { ...config, failOn } });
  const report = renderReport(result, format, false);
  await writeFile(resolve(output), report);
  core.setOutput("report", output);

  if (result.findings.some((finding) => meetsThreshold(finding.severity, failOn))) {
    core.setFailed(`awi-scan found ${result.findings.length} finding(s) at or above ${failOn}`);
  }
}

run().catch((error) => core.setFailed((error as Error).message));

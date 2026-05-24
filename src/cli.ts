import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Command } from "commander";
import { scan } from "./analyzer.js";
import { loadConfig } from "./config.js";
import { version } from "./index.js";
import { renderReport } from "./reporters/index.js";
import { ruleCatalog } from "./rules/catalog.js";
import { meetsThreshold } from "./scoring.js";
import type { FailThreshold, OutputFormat, Severity } from "./types.js";

const formats: OutputFormat[] = ["human", "json", "sarif"];
const thresholds: FailThreshold[] = ["low", "medium", "high", "critical", "none"];

const program = new Command();

program
  .name("awi-scan")
  .description("Detect Agentic Workflow Injection risks in GitHub Actions workflows.")
  .version(version)
  .argument("[paths...]", "paths to scan", ["."])
  .option("--format <format>", "output format: human, json, or sarif", "human")
  .option("--output <file>", "write report to a file")
  .option("--min-severity <severity>", "minimum severity to print", "low")
  .option("--fail-on <severity>", "exit 1 at this severity or above; use none to always exit 0")
  .option("--config <file>", "path to awi-scan.config.json")
  .option("--no-color", "disable color output")
  .action(async (paths: string[], options: Record<string, unknown>) => {
    try {
      const format = parseFormat(String(options.format));
      const minSeverity = parseSeverity(String(options.minSeverity));
      const root = process.cwd();
      const config = await loadConfig(root, options.config ? resolve(String(options.config)) : undefined);
      const failOn = parseThreshold(String(options.failOn ?? config.failOn));
      const result = await scan({ root, paths, config: { ...config, failOn } });
      const filtered = {
        ...result,
        findings: result.findings.filter((finding) => meetsThreshold(finding.severity, minSeverity))
      };
      const report = renderReport(filtered, format, Boolean(options.color));
      if (options.output) {
        await writeFile(resolve(String(options.output)), report);
      } else {
        process.stdout.write(report.endsWith("\n") ? report : `${report}\n`);
      }
      process.exitCode = result.findings.some((finding) => meetsThreshold(finding.severity, failOn)) ? 1 : 0;
    } catch (error) {
      process.stderr.write(`awi-scan: ${(error as Error).message}\n`);
      process.exitCode = 2;
    }
  });

program
  .command("rules")
  .description("List bundled rule ids")
  .action(() => {
    for (const rule of ruleCatalog) {
      process.stdout.write(`${rule.id}\t${rule.title}\n`);
    }
  });

program
  .command("explain")
  .argument("<rule-id>")
  .description("Explain a bundled rule")
  .action((ruleId: string) => {
    const rule = ruleCatalog.find((item) => item.id === ruleId);
    if (!rule) {
      process.stderr.write(`Unknown rule: ${ruleId}\n`);
      process.exitCode = 2;
      return;
    }
    process.stdout.write(`${rule.id}\n${rule.title}\n\n${rule.remediation}\n`);
  });

await program.parseAsync();

function parseFormat(value: string): OutputFormat {
  if (formats.includes(value as OutputFormat)) return value as OutputFormat;
  throw new Error(`Invalid format: ${value}`);
}

function parseThreshold(value: string): FailThreshold {
  if (thresholds.includes(value as FailThreshold)) return value as FailThreshold;
  throw new Error(`Invalid fail threshold: ${value}`);
}

function parseSeverity(value: string): Severity {
  const severities: Severity[] = ["low", "medium", "high", "critical"];
  if (severities.includes(value as Severity)) return value as Severity;
  throw new Error(`Invalid severity: ${value}`);
}

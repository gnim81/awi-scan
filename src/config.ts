import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { FailThreshold, ScanConfig, Severity } from "./types.js";

const severities: Severity[] = ["critical", "high", "medium", "low"];
const failThresholds: FailThreshold[] = [...severities, "none"];

export const defaultConfig: ScanConfig = {
  ignore: ["node_modules/**", "dist/**", "coverage/**", ".git/**"],
  rules: {},
  knownSafeActions: [],
  agentActions: [],
  failOn: "high"
};

export async function loadConfig(root: string, explicitPath?: string): Promise<ScanConfig> {
  const path = explicitPath ?? join(root, "awi-scan.config.json");
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT" && !explicitPath) {
      return defaultConfig;
    }
    throw error;
  }

  const parsed = JSON.parse(raw) as Partial<ScanConfig>;
  const failOn = parsed.failOn ?? defaultConfig.failOn;
  if (!failThresholds.includes(failOn)) {
    throw new Error(`Invalid failOn value: ${String(failOn)}`);
  }

  return {
    ignore: parsed.ignore ?? defaultConfig.ignore,
    rules: parsed.rules ?? defaultConfig.rules,
    knownSafeActions: parsed.knownSafeActions ?? defaultConfig.knownSafeActions,
    agentActions: parsed.agentActions ?? defaultConfig.agentActions,
    failOn
  };
}

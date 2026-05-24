import type { Confidence, Severity, SeverityInput } from "./types.js";

export function classifySeverity(input: SeverityInput): { severity: Severity; confidence: Confidence } {
  if (!input.hasCompleteFlow) {
    return { severity: "low", confidence: "low" };
  }
  if (input.hasPullRequestTarget && (input.hasWritePermission || input.hasSecrets)) {
    return { severity: "critical", confidence: "high" };
  }
  if (input.hasWritePermission || input.hasSecrets || input.hasSelfHostedRunner) {
    return { severity: "high", confidence: "high" };
  }
  return { severity: "medium", confidence: "medium" };
}

export const severityRank: Record<Severity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

export function meetsThreshold(severity: Severity, threshold: Severity | "none"): boolean {
  if (threshold === "none") return false;
  return severityRank[severity] >= severityRank[threshold];
}

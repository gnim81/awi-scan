import pc from "picocolors";
import type { ScanResult } from "../analyzer.js";

const colors = {
  critical: pc.red,
  high: pc.magenta,
  medium: pc.yellow,
  low: pc.blue
};

export function renderHuman(result: ScanResult, color = true): string {
  const paint = color ? colors : { critical: String, high: String, medium: String, low: String };
  if (result.findings.length === 0) {
    return `awi-scan: scanned ${result.scannedFiles.length} workflow file(s), no AWI findings.`;
  }

  const lines = [`awi-scan: ${result.findings.length} finding(s) in ${result.scannedFiles.length} workflow file(s)`];
  for (const finding of result.findings) {
    lines.push("");
    lines.push(
      `${paint[finding.severity](finding.severity)} ${finding.ruleId} ${finding.location.file}:${finding.location.line}:${finding.location.column}`
    );
    lines.push(`  ${finding.message}`);
    lines.push(`  Remediation: ${finding.remediation}`);
    for (const evidence of finding.evidence) {
      lines.push(`  - ${evidence.kind}: ${evidence.label}`);
    }
  }
  return lines.join("\n");
}

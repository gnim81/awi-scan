import type { ScanResult } from "../analyzer.js";
import { ruleCatalog } from "../rules/catalog.js";

export function renderSarif(result: ScanResult): string {
  return `${JSON.stringify(
    {
      $schema: "https://json.schemastore.org/sarif-2.1.0.json",
      version: "2.1.0",
      runs: [
        {
          tool: {
            driver: {
              name: "awi-scan",
              informationUri: "https://github.com/vanesio/awi-scan",
              rules: ruleCatalog.map((rule) => ({
                id: rule.id,
                name: rule.title,
                shortDescription: { text: rule.title },
                help: { text: rule.remediation },
                helpUri: rule.references[0]
              }))
            }
          },
          results: result.findings.map((finding) => ({
            ruleId: finding.ruleId,
            level: sarifLevel(finding.severity),
            message: { text: finding.message },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: finding.location.file },
                  region: { startLine: finding.location.line, startColumn: finding.location.column }
                }
              }
            ],
            properties: {
              severity: finding.severity,
              confidence: finding.confidence,
              remediation: finding.remediation,
              evidence: finding.evidence
            }
          }))
        }
      ]
    },
    null,
    2
  )}\n`;
}

function sarifLevel(severity: string): "error" | "warning" | "note" {
  if (severity === "critical" || severity === "high") return "error";
  if (severity === "medium") return "warning";
  return "note";
}

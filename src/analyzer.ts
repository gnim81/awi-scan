import { discoverWorkflowFiles } from "./discovery.js";
import { parseWorkflowFile } from "./parser.js";
import { ruleCatalog } from "./rules/catalog.js";
import { detectPrivileges, detectSinks, detectSources } from "./rules/matchers.js";
import { classifySeverity, severityRank } from "./scoring.js";
import type { Evidence, Finding, ScanOptions, Workflow } from "./types.js";

export interface ScanResult {
  scannedFiles: string[];
  findings: Finding[];
}

export async function scan(options: ScanOptions): Promise<ScanResult> {
  const files = await discoverWorkflowFiles(options.root, options.paths, options.config);
  const workflows = await Promise.all(files.map((file) => parseWorkflowFile(file, options.root)));
  const findings = workflows.flatMap((workflow) => analyzeWorkflow(workflow, options.config.agentActions));
  const filtered = findings
    .filter((finding) => options.config.rules[finding.ruleId]?.enabled !== false)
    .map((finding) => {
      const override = options.config.rules[finding.ruleId]?.severity;
      return override ? { ...finding, severity: override } : finding;
    })
    .sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || a.location.file.localeCompare(b.location.file));

  return { scannedFiles: workflows.map((workflow) => workflow.file), findings: filtered };
}

export function analyzeWorkflow(workflow: Workflow, customAgentActions: string[]): Finding[] {
  const sources = detectSources(workflow);
  const sinks = detectSinks(workflow, customAgentActions);
  const privileges = detectPrivileges(workflow);
  if (sources.length === 0 || sinks.length === 0) {
    return [];
  }

  const rule = ruleCatalog[0];
  const hasPullRequestTarget = privileges.some((privilege) => privilege.label === "pull_request_target");
  const hasWritePermission = privileges.some((privilege) => /write|write-all/i.test(privilege.label));
  const hasSecrets = privileges.some((privilege) => /secret/i.test(privilege.label));
  const hasSelfHostedRunner = privileges.some((privilege) => privilege.label === "self-hosted runner");
  const { severity, confidence } = classifySeverity({
    hasCompleteFlow: true,
    hasPullRequestTarget,
    hasWritePermission,
    hasSecrets,
    hasSelfHostedRunner
  });
  const sink = sinks[0]!;

  const evidence: Evidence[] = [
    ...sources.map((source) => ({
      kind: "source" as const,
      label: source.label,
      detail: source.value,
      location: source.location
    })),
    {
      kind: "sink" as const,
      label: sink.label,
      detail: sink.value,
      location: sink.location
    },
    ...privileges.map((privilege) => ({
      kind: "privilege" as const,
      label: privilege.label,
      detail: privilege.value,
      location: privilege.location
    }))
  ];

  return [
    {
      ruleId: rule.id,
      title: rule.title,
      severity,
      confidence,
      location: sink.location,
      evidence,
      message: "Untrusted GitHub event content can reach an AI agent running with workflow privileges.",
      remediation: rule.remediation,
      references: [...rule.references]
    }
  ];
}

import { discoverWorkflowFiles } from "./discovery.js";
import { parseWorkflowFile } from "./parser.js";
import { ruleCatalog } from "./rules/catalog.js";
import { detectPrivileges, detectSinks, detectSources, detectUntrustedCheckouts } from "./rules/matchers.js";
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
  const findings: Finding[] = [];

  const hasPullRequestTarget = privileges.some((privilege) => privilege.label === "pull_request_target");
  const hasWritePermission = privileges.some((privilege) => /write|write-all/i.test(privilege.label));
  const hasSecrets = privileges.some((privilege) => /secret/i.test(privilege.label));
  const hasSelfHostedRunner = privileges.some((privilege) => privilege.label === "self-hosted runner");

  if (sources.length > 0 && sinks.length > 0) {
    const rule = ruleCatalog[0]!;
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

    findings.push({
      ruleId: rule.id,
      title: rule.title,
      severity,
      confidence,
      location: sink.location,
      evidence,
      message: "Untrusted GitHub event content can reach an AI agent running with workflow privileges.",
      remediation: rule.remediation,
      references: [...rule.references]
    });
  }

  const untrustedCheckouts = detectUntrustedCheckouts(workflow);
  if (untrustedCheckouts.length > 0 && sinks.length > 0) {
    const rule = ruleCatalog.find((candidate) => candidate.id === "awi.untrusted-checkout-to-agent")!;
    const { severity, confidence } = classifySeverity({
      hasCompleteFlow: true,
      hasPullRequestTarget,
      hasWritePermission,
      hasSecrets,
      hasSelfHostedRunner
    });
    const checkout = untrustedCheckouts[0]!;
    const sink = sinks[0]!;
    const evidence: Evidence[] = [
      {
        kind: "source" as const,
        label: checkout.label,
        detail: checkout.value,
        location: checkout.location
      },
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

    findings.push({
      ruleId: rule.id,
      title: rule.title,
      severity,
      confidence,
      location: sink.location,
      evidence,
      message: "An AI agent can run after untrusted pull request code is checked out in a privileged workflow.",
      remediation: rule.remediation,
      references: [...rule.references]
    });
  }

  return findings;
}

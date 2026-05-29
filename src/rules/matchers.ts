import {
  agentCliPatterns,
  defaultAgentActionPatterns,
  promptInputNames,
  untrustedExpressionPatterns
} from "./catalog.js";
import type { DetectedCheckout, DetectedPrivilege, DetectedSink, DetectedSource, Workflow, WorkflowStep } from "../types.js";

function values(step: WorkflowStep): string[] {
  return [step.uses ?? "", step.run ?? "", ...Object.values(step.with), ...Object.values(step.env)].filter(Boolean);
}

function isAgentAction(uses: string, customAgentActions: string[]): boolean {
  const normalized = uses.toLowerCase();
  return (
    customAgentActions.some((action) => normalized.includes(action.toLowerCase())) ||
    defaultAgentActionPatterns.some((pattern) => pattern.test(uses))
  );
}

function isAgentRun(run: string): boolean {
  return agentCliPatterns.some((pattern) => pattern.test(run));
}

function containsUntrusted(value: string): boolean {
  return untrustedExpressionPatterns.some((pattern) => pattern.test(value));
}

export function detectSources(workflow: Workflow): DetectedSource[] {
  const sources: DetectedSource[] = [];
  for (const job of workflow.jobs) {
    for (const step of job.steps) {
      for (const value of values(step)) {
        if (containsUntrusted(value)) {
          const base = { label: readableSourceLabel(value), value, location: step.location, jobId: job.id };
          sources.push(step.id ? { ...base, stepId: step.id } : base);
        }
      }
    }
  }
  return sources;
}

function readableSourceLabel(value: string): string {
  const expression = value.match(/github\.event\.[A-Za-z_]+\.(body|title)/i)?.[0];
  if (expression) return expression;
  if (/GITHUB_EVENT_PATH/i.test(value)) return "GITHUB_EVENT_PATH";
  if (/gh\s+issue/i.test(value)) return "gh issue";
  if (/gh\s+pr/i.test(value)) return "gh pr";
  if (/gh\s+api/i.test(value)) return "gh api";
  return "untrusted event content";
}

export function detectSinks(workflow: Workflow, customAgentActions: string[]): DetectedSink[] {
  const sinks: DetectedSink[] = [];
  for (const job of workflow.jobs) {
    for (const step of job.steps) {
      const base = (label: string, value: string): DetectedSink => {
        const sink = { label, value, location: step.location, jobId: job.id };
        return step.id ? { ...sink, stepId: step.id } : sink;
      };
      if (step.uses && isAgentAction(step.uses, customAgentActions)) {
        sinks.push(base(step.uses, step.uses));
        continue;
      }
      if (step.run && isAgentRun(step.run)) {
        sinks.push(base("agent CLI", step.run));
        continue;
      }
      const hasPromptInput = Object.keys(step.with).some((key) => promptInputNames.includes(key.toLowerCase()));
      if (step.uses && hasPromptInput && /agent|ai|llm|bot|assistant|copilot|claude|codex|gemini/i.test(step.uses)) {
        sinks.push(base(step.uses, JSON.stringify(step.with)));
      }
    }
  }
  return sinks;
}

export function detectUntrustedCheckouts(workflow: Workflow): DetectedCheckout[] {
  const checkouts: DetectedCheckout[] = [];
  for (const job of workflow.jobs) {
    for (const step of job.steps) {
      if (!step.uses || !/^actions\/checkout@/i.test(step.uses)) {
        continue;
      }
      const checkoutValues = [step.with.repository ?? "", step.with.ref ?? ""].join("\n");
      if (!/github\.event\.pull_request\.head\.(repo\.full_name|sha|ref)/i.test(checkoutValues)) {
        continue;
      }
      const base = {
        label: "untrusted pull request checkout",
        value: checkoutValues,
        location: step.location,
        jobId: job.id
      };
      checkouts.push(step.id ? { ...base, stepId: step.id } : base);
    }
  }
  return checkouts;
}

export function detectPrivileges(workflow: Workflow): DetectedPrivilege[] {
  const privileges: DetectedPrivilege[] = [];
  if (workflow.triggers.includes("pull_request_target")) {
    privileges.push({
      label: "pull_request_target",
      value: "pull_request_target",
      location: { file: workflow.file, line: 1, column: 1 }
    });
  }

  for (const [scope, value] of Object.entries(workflow.permissions)) {
    if (isWritePermission(scope, value)) {
      privileges.push({ label: `${scope}: ${value}`, value, location: { file: workflow.file, line: 1, column: 1 } });
    }
  }

  for (const job of workflow.jobs) {
    if (job.runsOn.some((runner) => /self-hosted/i.test(runner))) {
      privileges.push({ label: "self-hosted runner", value: job.runsOn.join(", "), location: job.location, jobId: job.id });
    }
    for (const [scope, value] of Object.entries(job.permissions)) {
      if (isWritePermission(scope, value)) {
        privileges.push({ label: `${scope}: ${value}`, value, location: job.location, jobId: job.id });
      }
    }
    for (const step of job.steps) {
      const envValues = Object.values(step.env).join("\n");
      if (/secrets\./i.test(envValues)) {
        const base = {
          label: "secrets in agent step",
          value: envValues,
          location: step.location,
          jobId: job.id
        };
        privileges.push(step.id ? { ...base, stepId: step.id } : base);
      }
    }
  }

  return privileges;
}

function isWritePermission(scope: string, value: string): boolean {
  return value === "write" || value === "write-all" || scope === "write-all" || (scope === "id-token" && value === "write");
}

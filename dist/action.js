#!/usr/bin/env node

// src/action.ts
import { writeFile } from "fs/promises";
import { resolve as resolve2 } from "path";

// src/discovery.ts
import { resolve } from "path";
import fg from "fast-glob";
import createIgnoreUntyped from "ignore";
var createIgnore = createIgnoreUntyped;
async function discoverWorkflowFiles(root, paths, config) {
  const ig = createIgnore().add(config.ignore);
  const requested = paths.length > 0 ? paths : ["."];
  const normalized = requested.map((path) => path.replace(/\\/g, "/").replace(/\/$/, "")).flatMap((path) => {
    if (/\.(ya?ml)$/i.test(path) || /[*?[\]{}]/.test(path)) return [path];
    return [`${path}/**/*.{yml,yaml}`];
  });
  const entries = await fg(normalized, {
    cwd: root,
    absolute: false,
    dot: true,
    onlyFiles: true,
    unique: true
  });
  const direct = entries.filter((entry) => /\.ya?ml$/i.test(entry));
  const shouldIncludeDefaultWorkflows = requested.length === 0 || requested.includes(".") || requested.includes("./");
  const workflowGlob = shouldIncludeDefaultWorkflows ? await fg([".github/workflows/**/*.{yml,yaml}"], {
    cwd: root,
    absolute: false,
    dot: true,
    onlyFiles: true,
    unique: true
  }) : [];
  return Array.from(/* @__PURE__ */ new Set([...direct, ...workflowGlob])).filter((entry) => !ig.ignores(entry)).sort().map((entry) => resolve(root, entry));
}

// src/parser.ts
import { readFile } from "fs/promises";
import { relative } from "path";
import { parseDocument } from "yaml";
function location(file, line = 1, column = 1) {
  return { file, line, column };
}
function scalarValue(value) {
  if (value === null || value === void 0) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
function recordFrom(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, scalarValue(item)])
  );
}
function stringArray(value) {
  if (Array.isArray(value)) return value.map(scalarValue);
  if (typeof value === "string") return [value];
  return [];
}
function triggerNames(onValue) {
  if (typeof onValue === "string") return [onValue];
  if (Array.isArray(onValue)) return onValue.map(scalarValue);
  if (onValue && typeof onValue === "object") return Object.keys(onValue);
  return [];
}
function optionalString(value) {
  return typeof value === "string" ? value : void 0;
}
function optionalProp(key, value) {
  return value === void 0 ? {} : { [key]: value };
}
async function parseWorkflowFile(filePath, root) {
  const raw = await readFile(filePath, "utf8");
  const doc = parseDocument(raw, { keepSourceTokens: true, prettyErrors: true, version: "1.2" });
  if (doc.errors.length > 0) {
    throw new Error(`Failed to parse ${filePath}: ${doc.errors[0]?.message ?? "invalid YAML"}`);
  }
  const rel = relative(root, filePath).replace(/\\/g, "/");
  const data = doc.toJSON() ?? {};
  const jobsValue = data.jobs && typeof data.jobs === "object" ? data.jobs : {};
  const jobs = Object.entries(jobsValue).map(([id, rawJob]) => {
    const job = rawJob && typeof rawJob === "object" ? rawJob : {};
    const stepsRaw = Array.isArray(job.steps) ? job.steps : [];
    const steps = stepsRaw.map((rawStep) => {
      const step = rawStep && typeof rawStep === "object" ? rawStep : {};
      return {
        ...optionalProp("id", optionalString(step.id)),
        ...optionalProp("name", optionalString(step.name)),
        ...optionalProp("uses", optionalString(step.uses)),
        ...optionalProp("run", optionalString(step.run)),
        ...optionalProp("shell", optionalString(step.shell)),
        with: recordFrom(step.with),
        env: recordFrom(step.env),
        location: location(rel)
      };
    });
    return {
      id,
      ...optionalProp("name", optionalString(job.name)),
      runsOn: stringArray(job["runs-on"]),
      permissions: recordFrom(job.permissions),
      env: recordFrom(job.env),
      steps,
      location: location(rel)
    };
  });
  return {
    file: rel,
    ...optionalProp("name", optionalString(data.name)),
    triggers: triggerNames(data.on),
    permissions: recordFrom(data.permissions),
    env: recordFrom(data.env),
    jobs
  };
}

// src/rules/catalog.ts
var ruleCatalog = [
  {
    id: "awi.untrusted-prompt-to-agent",
    title: "Untrusted GitHub event content reaches an agent prompt",
    remediation: "Avoid sending raw issue, pull request, review, discussion, or comment text directly to an agent. Gate execution on trusted labels or approvals, use read-only permissions, and provide the untrusted text as quoted context with explicit tool restrictions.",
    references: [
      "https://github.blog/ai-and-ml/generative-ai/under-the-hood-security-architecture-of-github-agentic-workflows/",
      "https://arxiv.org/abs/2605.07135"
    ]
  },
  {
    id: "awi.agent-output-to-privileged-step",
    title: "Agent output flows into a privileged follow-up step",
    remediation: "Do not execute or evaluate agent-generated text. Require a human review boundary before shell execution, GitHub API mutation, or privileged artifact handoff.",
    references: ["https://arxiv.org/abs/2605.07135"]
  },
  {
    id: "awi.untrusted-checkout-to-agent",
    title: "Untrusted pull request code is checked out before an agent runs",
    remediation: "Do not run privileged agents on code checked out from an untrusted pull request head. Use the base repository checkout, require maintainer approval, or move the agent to a read-only pull_request workflow.",
    references: ["https://github.com/anthropics/claude-code-action/blob/main/docs/security.md"]
  }
];
var defaultAgentActionPatterns = [
  /anthropic.*claude.*code/i,
  /claude.*code.*action/i,
  /github.*copilot/i,
  /openai.*codex/i,
  /google.*gemini/i,
  /aider/i,
  /opencode/i,
  /cursor/i
];
var agentCliPatterns = [
  /\bclaude\b/i,
  /\bcodex\b/i,
  /\bgemini\b/i,
  /\baider\b/i,
  /\bopencode\b/i,
  /\bcopilot\b/i
];
var untrustedExpressionPatterns = [
  /github\.event\.issue\.(body|title)/i,
  /github\.event\.pull_request\.(body|title)/i,
  /github\.event\.comment\.body/i,
  /github\.event\.review\.body/i,
  /github\.event\.discussion\.(body|title)/i,
  /\$GITHUB_EVENT_PATH/i,
  /GITHUB_EVENT_PATH/i,
  /gh\s+(issue|pr|api|discussion)/i,
  /api\.github\.com\/repos\/.+\/(issues|pulls|comments|discussions)/i
];
var promptInputNames = ["prompt", "instruction", "instructions", "task", "message", "body", "query", "input"];

// src/rules/matchers.ts
function values(step) {
  return [step.uses ?? "", step.run ?? "", ...Object.values(step.with), ...Object.values(step.env)].filter(Boolean);
}
function isAgentAction(uses, customAgentActions) {
  const normalized = uses.toLowerCase();
  return customAgentActions.some((action) => normalized.includes(action.toLowerCase())) || defaultAgentActionPatterns.some((pattern) => pattern.test(uses));
}
function isAgentRun(run2) {
  return agentCliPatterns.some((pattern) => pattern.test(run2));
}
function containsUntrusted(value) {
  return untrustedExpressionPatterns.some((pattern) => pattern.test(value));
}
function detectSources(workflow) {
  const sources = [];
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
function readableSourceLabel(value) {
  const expression = value.match(/github\.event\.[A-Za-z_]+\.(body|title)/i)?.[0];
  if (expression) return expression;
  if (/GITHUB_EVENT_PATH/i.test(value)) return "GITHUB_EVENT_PATH";
  if (/gh\s+issue/i.test(value)) return "gh issue";
  if (/gh\s+pr/i.test(value)) return "gh pr";
  if (/gh\s+api/i.test(value)) return "gh api";
  return "untrusted event content";
}
function detectSinks(workflow, customAgentActions) {
  const sinks = [];
  for (const job of workflow.jobs) {
    for (const step of job.steps) {
      const base = (label, value) => {
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
function detectUntrustedCheckouts(workflow) {
  const checkouts = [];
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
function detectPrivileges(workflow) {
  const privileges = [];
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
function isWritePermission(scope, value) {
  return value === "write" || value === "write-all" || scope === "write-all" || scope === "id-token" && value === "write";
}

// src/scoring.ts
function classifySeverity(input) {
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
var severityRank = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};
function meetsThreshold(severity, threshold) {
  if (threshold === "none") return false;
  return severityRank[severity] >= severityRank[threshold];
}

// src/analyzer.ts
async function scan(options) {
  const files = await discoverWorkflowFiles(options.root, options.paths, options.config);
  const workflows = await Promise.all(files.map((file) => parseWorkflowFile(file, options.root)));
  const findings = workflows.flatMap((workflow) => analyzeWorkflow(workflow, options.config.agentActions));
  const filtered = findings.filter((finding) => options.config.rules[finding.ruleId]?.enabled !== false).map((finding) => {
    const override = options.config.rules[finding.ruleId]?.severity;
    return override ? { ...finding, severity: override } : finding;
  }).sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || a.location.file.localeCompare(b.location.file));
  return { scannedFiles: workflows.map((workflow) => workflow.file), findings: filtered };
}
function analyzeWorkflow(workflow, customAgentActions) {
  const sources = detectSources(workflow);
  const sinks = detectSinks(workflow, customAgentActions);
  const privileges = detectPrivileges(workflow);
  const findings = [];
  const hasPullRequestTarget = privileges.some((privilege) => privilege.label === "pull_request_target");
  const hasWritePermission = privileges.some((privilege) => /write|write-all/i.test(privilege.label));
  const hasSecrets = privileges.some((privilege) => /secret/i.test(privilege.label));
  const hasSelfHostedRunner = privileges.some((privilege) => privilege.label === "self-hosted runner");
  if (sources.length > 0 && sinks.length > 0) {
    const rule = ruleCatalog[0];
    const { severity, confidence } = classifySeverity({
      hasCompleteFlow: true,
      hasPullRequestTarget,
      hasWritePermission,
      hasSecrets,
      hasSelfHostedRunner
    });
    const sink = sinks[0];
    const evidence = [
      ...sources.map((source) => ({
        kind: "source",
        label: source.label,
        detail: source.value,
        location: source.location
      })),
      {
        kind: "sink",
        label: sink.label,
        detail: sink.value,
        location: sink.location
      },
      ...privileges.map((privilege) => ({
        kind: "privilege",
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
    const rule = ruleCatalog.find((candidate) => candidate.id === "awi.untrusted-checkout-to-agent");
    const { severity, confidence } = classifySeverity({
      hasCompleteFlow: true,
      hasPullRequestTarget,
      hasWritePermission,
      hasSecrets,
      hasSelfHostedRunner
    });
    const checkout = untrustedCheckouts[0];
    const sink = sinks[0];
    const evidence = [
      {
        kind: "source",
        label: checkout.label,
        detail: checkout.value,
        location: checkout.location
      },
      {
        kind: "sink",
        label: sink.label,
        detail: sink.value,
        location: sink.location
      },
      ...privileges.map((privilege) => ({
        kind: "privilege",
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

// src/config.ts
import { readFile as readFile2 } from "fs/promises";
import { join } from "path";
var severities = ["critical", "high", "medium", "low"];
var failThresholds = [...severities, "none"];
var defaultConfig = {
  ignore: ["node_modules/**", "dist/**", "coverage/**", ".git/**"],
  rules: {},
  knownSafeActions: [],
  agentActions: [],
  failOn: "high"
};
async function loadConfig(root, explicitPath) {
  const path = explicitPath ?? join(root, "awi-scan.config.json");
  let raw;
  try {
    raw = await readFile2(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT" && !explicitPath) {
      return defaultConfig;
    }
    throw error;
  }
  const parsed = JSON.parse(raw);
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

// src/github-action-io.ts
import { appendFileSync } from "fs";
function getInput(name, env = process.env) {
  return env[inputKey(name)]?.trim() ?? "";
}
function getMultilineInput(name, env = process.env) {
  return getInput(name, env).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}
function setOutput(name, value, write = (line) => process.stdout.write(`${line}
`), env = process.env) {
  if (env.GITHUB_OUTPUT) {
    appendFileSync(env.GITHUB_OUTPUT, `${name}=${value}
`, "utf8");
    return;
  }
  write(`::set-output name=${escapeCommand(name)}::${escapeCommand(value)}`);
}
function setFailed(message, write = (line) => process.stderr.write(`${line}
`)) {
  write(`::error::${escapeCommand(message)}`);
  process.exitCode = 1;
}
function inputKey(name) {
  return `INPUT_${name.replace(/ /g, "_").replace(/-/g, "_").toUpperCase()}`;
}
function escapeCommand(value) {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

// src/reporters/human.ts
import pc from "picocolors";
var colors = {
  critical: pc.red,
  high: pc.magenta,
  medium: pc.yellow,
  low: pc.blue
};
function renderHuman(result, color = true) {
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

// src/reporters/json.ts
function renderJson(result) {
  return `${JSON.stringify(result, null, 2)}
`;
}

// src/reporters/sarif.ts
function renderSarif(result) {
  return `${JSON.stringify(
    {
      $schema: "https://json.schemastore.org/sarif-2.1.0.json",
      version: "2.1.0",
      runs: [
        {
          tool: {
            driver: {
              name: "awi-scan",
              informationUri: "https://github.com/gnim81/awi-scan",
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
  )}
`;
}
function sarifLevel(severity) {
  if (severity === "critical" || severity === "high") return "error";
  if (severity === "medium") return "warning";
  return "note";
}

// src/reporters/index.ts
function renderReport(result, format, color = true) {
  if (format === "json") return renderJson(result);
  if (format === "sarif") return renderSarif(result);
  return renderHuman(result, color);
}

// src/action.ts
async function run() {
  const root = process.cwd();
  const paths = getMultilineInput("paths");
  const format = getInput("format") || "sarif";
  const failOn = getInput("fail-on") || "high";
  const output = getInput("output") || "awi-scan.sarif";
  const config = await loadConfig(root);
  const result = await scan({ root, paths: paths.length > 0 ? paths : ["."], config: { ...config, failOn } });
  const report = renderReport(result, format, false);
  await writeFile(resolve2(output), report);
  setOutput("report", output);
  if (result.findings.some((finding) => meetsThreshold(finding.severity, failOn))) {
    setFailed(`awi-scan found ${result.findings.length} finding(s) at or above ${failOn}`);
  }
}
run().catch((error) => setFailed(error.message));
//# sourceMappingURL=action.js.map
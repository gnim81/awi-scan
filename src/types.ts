export type Severity = "critical" | "high" | "medium" | "low";
export type Confidence = "high" | "medium" | "low";
export type OutputFormat = "human" | "json" | "sarif";
export type FailThreshold = Severity | "none";

export interface Location {
  file: string;
  line: number;
  column: number;
}

export interface Evidence {
  kind: "source" | "sink" | "privilege" | "flow";
  label: string;
  detail: string;
  location?: Location;
}

export interface Finding {
  ruleId: string;
  title: string;
  severity: Severity;
  confidence: Confidence;
  location: Location;
  evidence: Evidence[];
  message: string;
  remediation: string;
  references: string[];
}

export interface RuleOverride {
  enabled?: boolean;
  severity?: Severity;
}

export interface ScanConfig {
  ignore: string[];
  rules: Record<string, RuleOverride>;
  knownSafeActions: string[];
  agentActions: string[];
  failOn: FailThreshold;
}

export interface ScanOptions {
  root: string;
  paths: string[];
  config: ScanConfig;
}

export interface WorkflowStep {
  id?: string;
  name?: string;
  uses?: string;
  run?: string;
  shell?: string;
  with: Record<string, string>;
  env: Record<string, string>;
  location: Location;
}

export interface WorkflowJob {
  id: string;
  name?: string;
  runsOn: string[];
  permissions: Record<string, string>;
  env: Record<string, string>;
  steps: WorkflowStep[];
  location: Location;
}

export interface Workflow {
  file: string;
  name?: string;
  triggers: string[];
  permissions: Record<string, string>;
  env: Record<string, string>;
  jobs: WorkflowJob[];
}

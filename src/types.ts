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

import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import { parseDocument } from "yaml";
import type { Location, Workflow, WorkflowJob, WorkflowStep } from "./types.js";

function location(file: string, line = 1, column = 1): Location {
  return { file, line, column };
}

function scalarValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function recordFrom(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, scalarValue(item)])
  );
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(scalarValue);
  if (typeof value === "string") return [value];
  return [];
}

function triggerNames(onValue: unknown): string[] {
  if (typeof onValue === "string") return [onValue];
  if (Array.isArray(onValue)) return onValue.map(scalarValue);
  if (onValue && typeof onValue === "object") return Object.keys(onValue);
  return [];
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function optionalProp<K extends string>(key: K, value: string | undefined): Partial<Record<K, string>> {
  return value === undefined ? {} : { [key]: value } as Record<K, string>;
}

export async function parseWorkflowFile(filePath: string, root: string): Promise<Workflow> {
  const raw = await readFile(filePath, "utf8");
  const doc = parseDocument(raw, { keepSourceTokens: true, prettyErrors: true, version: "1.2" });
  if (doc.errors.length > 0) {
    throw new Error(`Failed to parse ${filePath}: ${doc.errors[0]?.message ?? "invalid YAML"}`);
  }

  const rel = relative(root, filePath).replace(/\\/g, "/");
  const data = (doc.toJSON() ?? {}) as Record<string, unknown>;
  const jobsValue = data.jobs && typeof data.jobs === "object" ? (data.jobs as Record<string, unknown>) : {};
  const jobs: WorkflowJob[] = Object.entries(jobsValue).map(([id, rawJob]) => {
    const job = rawJob && typeof rawJob === "object" ? (rawJob as Record<string, unknown>) : {};
    const stepsRaw = Array.isArray(job.steps) ? job.steps : [];
    const steps: WorkflowStep[] = stepsRaw.map((rawStep) => {
      const step = rawStep && typeof rawStep === "object" ? (rawStep as Record<string, unknown>) : {};
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

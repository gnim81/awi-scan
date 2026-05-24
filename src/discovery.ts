import { resolve } from "node:path";
import fg from "fast-glob";
import createIgnoreUntyped from "ignore";
import type { Ignore } from "ignore";
import type { ScanConfig } from "./types.js";

const createIgnore = createIgnoreUntyped as unknown as () => Ignore;

export async function discoverWorkflowFiles(root: string, paths: string[], config: ScanConfig): Promise<string[]> {
  const ig = createIgnore().add(config.ignore);
  const requested = paths.length > 0 ? paths : ["."];
  const normalized = requested
    .map((path) => path.replace(/\\/g, "/").replace(/\/$/, ""))
    .flatMap((path) => {
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
  const workflowGlob = await fg([".github/workflows/**/*.{yml,yaml}"], {
    cwd: root,
    absolute: false,
    dot: true,
    onlyFiles: true,
    unique: true
  });

  return Array.from(new Set([...direct, ...workflowGlob]))
    .filter((entry) => !ig.ignores(entry))
    .sort()
    .map((entry) => resolve(root, entry));
}

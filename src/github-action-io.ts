import { appendFileSync } from "node:fs";

type Env = Record<string, string | undefined>;
type Writer = (line: string) => void;

export function getInput(name: string, env: Env = process.env): string {
  return env[inputKey(name)]?.trim() ?? "";
}

export function getMultilineInput(name: string, env: Env = process.env): string[] {
  return getInput(name, env)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function setOutput(
  name: string,
  value: string,
  write: Writer = (line) => process.stdout.write(`${line}\n`),
  env: Env = process.env
): void {
  if (env.GITHUB_OUTPUT) {
    appendFileSync(env.GITHUB_OUTPUT, `${name}=${value}\n`, "utf8");
    return;
  }
  write(`::set-output name=${escapeCommand(name)}::${escapeCommand(value)}`);
}

export function setFailed(message: string, write: Writer = (line) => process.stderr.write(`${line}\n`)): void {
  write(`::error::${escapeCommand(message)}`);
  process.exitCode = 1;
}

function inputKey(name: string): string {
  return `INPUT_${name.replace(/ /g, "_").replace(/-/g, "_").toUpperCase()}`;
}

function escapeCommand(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

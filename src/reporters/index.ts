import type { ScanResult } from "../analyzer.js";
import type { OutputFormat } from "../types.js";
import { renderHuman } from "./human.js";
import { renderJson } from "./json.js";
import { renderSarif } from "./sarif.js";

export { renderHuman, renderJson, renderSarif };

export function renderReport(result: ScanResult, format: OutputFormat, color = true): string {
  if (format === "json") return renderJson(result);
  if (format === "sarif") return renderSarif(result);
  return renderHuman(result, color);
}

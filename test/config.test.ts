import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { defaultConfig, loadConfig } from "../src/config.js";

describe("config", () => {
  it("uses safe defaults when no config file exists", async () => {
    const dir = await mkdtemp(join(tmpdir(), "awi-config-"));
    await expect(loadConfig(dir)).resolves.toEqual(defaultConfig);
  });

  it("merges a project config with defaults", async () => {
    const dir = await mkdtemp(join(tmpdir(), "awi-config-"));
    await writeFile(
      join(dir, "awi-scan.config.json"),
      JSON.stringify({
        ignore: ["vendor/**"],
        failOn: "critical",
        agentActions: ["example/agent@v1"],
        knownSafeActions: ["example/safe@v1"],
        rules: {
          "awi.untrusted-prompt-to-agent": { severity: "critical", enabled: true }
        }
      })
    );

    await expect(loadConfig(dir)).resolves.toMatchObject({
      ignore: ["vendor/**"],
      failOn: "critical",
      agentActions: ["example/agent@v1"],
      knownSafeActions: ["example/safe@v1"],
      rules: {
        "awi.untrusted-prompt-to-agent": { severity: "critical", enabled: true }
      }
    });
  });

  it("rejects invalid failOn values", async () => {
    const dir = await mkdtemp(join(tmpdir(), "awi-config-"));
    await writeFile(join(dir, "awi-scan.config.json"), JSON.stringify({ failOn: "urgent" }));
    await expect(loadConfig(dir)).rejects.toThrow("Invalid failOn value");
  });
});

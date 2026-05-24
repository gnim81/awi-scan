import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("release assets", () => {
  it("does not ignore the GitHub Action runtime bundle", async () => {
    const gitignore = await readFile(".gitignore", "utf8");
    expect(gitignore).toContain("!dist/action.js");
  });

  it("builds action runtime as a single file without local chunk imports", async () => {
    const action = await readFile("dist/action.js", "utf8");
    expect(action).not.toMatch(/from "\.\/chunk-/);
  });
});

import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts", "src/cli.ts", "src/action.ts"],
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    target: "node20",
    banner: {
      js: "#!/usr/bin/env node"
    }
  }
]);

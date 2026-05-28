import packageJson from "../package.json" with { type: "json" };

export const version = packageJson.version;

export * from "./analyzer.js";
export * from "./config.js";
export * from "./discovery.js";
export * from "./parser.js";
export * from "./reporters/index.js";
export * from "./scoring.js";
export * from "./types.js";
export * from "./rules/catalog.js";
export * from "./rules/matchers.js";

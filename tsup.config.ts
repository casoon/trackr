import { defineConfig } from "tsup";

export default defineConfig([
  // ESM library build (Node.js / bundler usage)
  {
    entry: [
      "src/index.ts",
      "src/client/index.ts",
      "src/server/index.ts",
      "src/storage/postgres.ts",
      "src/storage/api.ts",
      "src/storage/ga4.ts",
      "src/storage/multi.ts",
      "src/server/pixel.ts",
    ],
    format: ["esm"],
    dts: true,
    clean: true,
    sourcemap: true,
    minify: false,
    target: "es2022",
  },
  // IIFE browser script — window.trackr.init() / window.trackr.track()
  // Output: script.js (listed in package.json "files")
  {
    entry: { script: "src/client/index.ts" },
    format: ["iife"],
    globalName: "trackr",
    outDir: ".",
    minify: true,
    sourcemap: false,
    target: "es2019",
    dts: false,
    outExtension: () => ({ js: ".js" }),
  },
]);

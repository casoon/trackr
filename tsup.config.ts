import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/client/index.ts",
    "src/server/index.ts",
    "src/storage/postgres.ts",
    "src/storage/api.ts",
  ],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,
  target: "es2022",
});

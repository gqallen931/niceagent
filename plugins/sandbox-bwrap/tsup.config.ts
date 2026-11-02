import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node24",
  dts: true,
  clean: false, // Safe-Delete shim blocks bulk dist deletion
  sourcemap: true,
});

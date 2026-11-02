import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node24",
  dts: true,
  clean: false, // Safe-Delete shim blocks bulk dist deletion
  sourcemap: true,
  // The DSH chain stays a dependency tree rather than being compiled in: it resolves its
  // per-platform rung by bare specifier at run time (`@deepseek-ai/dsh-sandbox-windows-acl`
  // on Windows), which a bundle turns into an unresolvable import — the Windows rung, the
  // one confinement on that platform that runs Git Bash, failed exactly there. A push carries
  // each of its packages as one archive, so the tree costs a handful of blobs, not a file each.
  external: [/^@deepseek-ai\//, "koffi"],
  // Bundled CommonJS calls require(); an ESM bundle has none of its own.
  banner: {
    js: 'import { createRequire as __niceagentCreateRequire } from "node:module"; const require = __niceagentCreateRequire(import.meta.url);',
  },
});

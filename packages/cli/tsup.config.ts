import { defineConfig } from "tsup";
import { stageBenchmarks } from "../../scripts/build-benchmarks.mjs";
// Inlines this checkout's git identity into the artifact — see the helper's module doc:
// the niceagent binary bundles core, and a shipped bundle has no path back to the checkout it came from.
import { buildGitDefine } from "../../scripts/build-git-stamp.mjs";

export default defineConfig({
  // `niceagent` is the primary command name; `niceagent-hmr` is the HMR entry. Both keep
  // their historical dist names so installed layouts and remote machines (install.sh, launchers,
  // remoteNiceAgent) keep exec'ing `lib/dist/niceagent.js` across versions.
  entry: {
    "niceagent": "src/niceagent.ts",
    "niceagent-hmr": "src/niceagent-hmr.ts",
  },
  format: ["esm"],
  target: "node24",
  platform: "node",
  clean: false, // Safe-Delete shim blocks bulk dist deletion; run `pnpm -w run clean` manually instead
  sourcemap: true,
  // Bundle the workspace source @niceagent/core, but keep third-party deps (incl.
  // CJS yaml / smol-toml / mmsp) external and resolved from node_modules at runtime —
  // avoids bundling CJS deps into ESM and triggering a "Dynamic require" error.
  // The @niceagent/* plugin packages are data-only and never imported as modules: the
  // bundled core loader resolves their directories through this package's own dependencies
  // (files are the source of truth), which is why the CLI declares them directly.
  // @niceagent/server stays external: the niceagent server / web commands import it
  // dynamically at runtime.
  // tsup treats this package's package.json dependencies as external by default, so these
  // deps are already declared there.
  noExternal: ["@niceagent/core"],
  banner: { js: "#!/usr/bin/env node" },
  define: buildGitDefine(),
  onSuccess: () => stageBenchmarks("dist/builtin-benchmarks"),
});

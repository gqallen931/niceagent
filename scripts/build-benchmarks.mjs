/**
 * Stage the Benchmark manifests and Case Markdown at build time for packaging.
 * The content is vendored under `benchmarks/` in this repository, so a build never
 * reaches the network. `--refresh` re-stages from that directory. NICEAGENT_BENCHMARKS_SOURCE
 * can name another packages/ directory when developing the data separately.
 */
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const BENCHMARKS_DIR = path.join(ROOT, "node_modules", ".cache", "niceagent-benchmarks");
/** The vendored Benchmark packages this repository builds from. */
const VENDORED = path.join(ROOT, "benchmarks");
const require = createRequire(path.join(ROOT, "packages/core/package.json"));
const { parse } = require("smol-toml");

export async function buildBenchmarks({ refresh = false } = {}) {
  const source = process.env.NICEAGENT_BENCHMARKS_SOURCE || (existsSync(VENDORED) ? VENDORED : undefined);
  if (!source) throw new Error(`No Benchmark packages: ${VENDORED} is missing.`);
  if (!refresh) {
    try {
      await fs.access(path.join(BENCHMARKS_DIR, "catalog.json"));
      return;
    } catch {
      // The first source build stages the packages; later builds reuse that snapshot.
    }
  }
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "niceagent-benchmarks-"));
  try {
    const packages = path.resolve(source);
    const staged = path.join(temp, "packages");
    await fs.mkdir(staged);
    const catalog = [];
    for (const entry of (await fs.readdir(packages, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      const dir = path.join(packages, entry.name);
      if (!existsSync(path.join(dir, "benchmark_config.toml"))) continue;
      const manifest = await fs.readFile(path.join(dir, "benchmark_config.toml"), "utf8");
      const { description_zh: descriptionZh, ...config } = parse(manifest);
      if (config.id !== entry.name)
        throw new Error(`Benchmark id does not match its directory: ${dir}`);
      const dest = path.join(staged, entry.name);
      await fs.mkdir(dest);
      await fs.writeFile(path.join(dest, "benchmark_config.toml"), manifest);
      const cases = [];
      for (const item of (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) =>
        a.name.localeCompare(b.name),
      )) {
        if (!item.isDirectory() || !item.name.startsWith("CASE-")) continue;
        const caseDir = path.join(dir, item.name);
        const statement = await fs.readFile(path.join(caseDir, "statement/README.md"), "utf8");
        const rubric = await fs.readFile(path.join(caseDir, "rubric/README.md"), "utf8");
        for (const [part, text] of [
          ["statement", statement],
          ["rubric", rubric],
        ]) {
          const target = path.join(dest, item.name, part);
          await fs.mkdir(target, { recursive: true });
          await fs.writeFile(path.join(target, "README.md"), text, "utf8");
        }
        cases.push({
          id: item.name,
          title: /^#\s+(.+)$/m.exec(statement)?.[1] ?? item.name,
          statement,
          rubric,
        });
      }
      if (cases.length === 0) throw new Error(`Benchmark has no cases: ${dir}`);
      catalog.push({ ...config, ...(descriptionZh === undefined ? {} : { descriptionZh }), cases });
    }
    if (catalog.length === 0) throw new Error(`No Benchmark packages found in ${packages}`);
    // The browser gallery consumes the same texts, without importing Node's filesystem loader.
    await fs.writeFile(path.join(staged, "catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`);
    await fs.rm(BENCHMARKS_DIR, { recursive: true, force: true });
    await fs.cp(staged, BENCHMARKS_DIR, { recursive: true });
    console.log(
      `Benchmark packages: ${catalog.length} staged from ${source ?? `${REPOSITORY} (main)`}`,
    );
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
}

/** The core, bundled CLI and desktop carry the files beside their JavaScript bundles. */
export async function stageBenchmarks(dest) {
  await fs.rm(dest, { recursive: true, force: true });
  await fs.cp(BENCHMARKS_DIR, dest, {
    recursive: true,
    filter: (file) => file !== path.join(BENCHMARKS_DIR, "catalog.json"),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { values } = parseArgs({
    options: { refresh: { type: "boolean" }, stage: { type: "string" } },
  });
  if (values.stage) await stageBenchmarks(path.resolve(values.stage));
  else await buildBenchmarks({ refresh: values.refresh });
}

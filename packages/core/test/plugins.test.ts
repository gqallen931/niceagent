/**
 * The plugin library's file source of truth and core's loader: one npm package per plugin under the repo's `plugins/`
 * (its package.json is the manifest: npm's fields and a `niceagent` block; the skills and hook
 * packages it ships), the version scheme, the category grouping, the preinstall filter, the name
 * lookups, and the doc conventions every shipped skill follows.
 *
 * The shipped library, as it is in the repo:
 * - Every shipped package.json reads with no warning: a description, both short descriptions, a
 *   known category, a safe icon — and no plugin.json is shipped or left on disk.
 *
 * Versions, on a fixture library a temp host package carries (usePushedPluginLibrary):
 * - A plugin's version is the npm version of its package.json.
 * - Each skill keeps its own dated version through the loader's stamp, and the hook package
 *   carries `niceagent.hooks.version`.
 * - A shipped skill without a dated version, or shipped `hooks/` without
 *   `niceagent.hooks.version`, fails the load naming the file, rather than reading as a version
 *   every install is behind; so does any other warning-level fault in a shipped package, an MCP
 *   server entry the resolver refuses among them.
 *
 * What the operator installed on the server, on a fixture prefix (useInstalledPluginPrefix):
 * - A package of Skills the prefix depends on joins the library as installed, under its name
 *   without the scope, and is never preinstalled.
 * - A package of server modules alone, a name the build ships, and what npm installed beside the
 *   prefix's own packages stay out.
 * - An installed package that will not read is left out with a warning; the library still
 *   loads.
 * - Missing is missing: a package.json with only a name and a version lists its skills with no
 *   description, no category (Other), no icon and no quick start.
 * - What a shipped package fails on, an installed one lists through, with the field missing and
 *   one warning: a malformed field, `hooks/` without a hook version (the skills still list), a
 *   skill without a version (unversioned, never flagged behind), an unsafe or oversized icon, a
 *   skill directory whose name is not a skill name (left out), a binary file in a skill (left
 *   out; the text beside it installs byte for byte). A safe icon is kept from its `<svg>` root on.
 * - An old package that still carries a plugin.json lists by its directories; nothing is read
 *   from the plugin.json.
 * - A package of MCP servers alone (`niceagent.mcp_servers`, no skills/ or hooks/) is a library
 *   plugin: it lists its servers, each with every vault key its config references — declared
 *   ones with their labels first — and whether it offers OAuth sign-in. An empty server list
 *   makes no plugin.
 * - A server entry the resolver refuses (an unknown transport, a vault reference in the host), a
 *   bad or repeated server name and a setup key nothing references are dropped, one warning
 *   each; the valid servers still list.
 */
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parse as parseYaml } from "yaml";
import {
  PLUGIN_CATEGORIES,
  PLUGIN_VERSION_PATTERN,
  comparePluginVersions,
  groupPlugins,
  isSafeIconSvg,
  libraryParts,
  libraryPlugin,
  librarySkill,
  loadLibraryPlugins,
  loadPluginGroups,
  libraryPluginPackage,
  loadPreinstalledPlugins,
  parsePluginPackage,
  parseSkillFrontmatter,
  readLibraryPackage,
  readPluginIcon,
  useInstalledPluginPrefix,
  usePushedPluginLibrary,
  workspacePluginRoot,
  type LibraryPlugin,
} from "../src/plugins/index.js";
import { formatFrontmatter } from "@niceagent/skills";

const pluginsRoot = path.resolve(import.meta.dirname, "../../../plugins");

/** Minimal LibraryPlugin for groupPlugins unit tests. */
const fakePlugin = (name: string, category?: string): LibraryPlugin => ({
  name,
  packageName: `@niceagent/${name}`,
  description: `Do ${name}.`,
  version: "0.2.13",
  preinstall: true,
  skills: [],
  mcpServers: [],
  ...(category !== undefined ? { category } : {}),
});

describe("loadLibraryPlugins", () => {
  it("loads every plugin directory sorted by name: its npm version, a category, and a dated version on every part", async () => {
    const plugins = loadLibraryPlugins();
    expect(plugins.map((p) => p.name)).toEqual([...plugins.map((p) => p.name)].sort());
    const { dependencies } = JSON.parse(
      await fs.readFile(path.resolve(import.meta.dirname, "../package.json"), "utf8"),
    ) as { dependencies: Record<string, string> };
    expect(plugins.map((plugin) => plugin.packageName).sort()).toEqual(
      Object.keys(dependencies)
        .filter((name) => name.startsWith("@niceagent/"))
        .sort(),
    );
    for (const plugin of plugins) {
      const pkg = JSON.parse(
        await fs.readFile(path.join(pluginsRoot, plugin.name, "package.json"), "utf8"),
      ) as { version: string };
      expect(plugin.version, plugin.name).toBe(pkg.version);
      for (const skill of plugin.skills) {
        expect(skill.version, `${plugin.name}/${skill.name}`).toMatch(PLUGIN_VERSION_PATTERN);
      }
      if (plugin.hooks !== undefined) {
        expect(plugin.hooks.manifest.version, plugin.name).toMatch(PLUGIN_VERSION_PATTERN);
      }
      expect(
        PLUGIN_CATEGORIES.map((c) => c.id),
        plugin.name,
      ).toContain(plugin.category);
      expect(plugin.description.length, plugin.name).toBeGreaterThan(0);
      expect(plugin.skills.length > 0 || plugin.hooks !== undefined, plugin.name).toBe(true);
    }
  });

  it("every shipped package.json reads clean: described for the card in both languages, a known category, a safe icon, and no plugin.json anywhere", async () => {
    const dirs = (await fs.readdir(pluginsRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    // The four sandbox backends are packages of server modules: their cards read the same block.
    expect(dirs.length).toBeGreaterThan(0);
    for (const dir of dirs) {
      const file = path.join(pluginsRoot, dir, "package.json");
      const text = await fs.readFile(file, "utf8");
      // Chinese in a manifest is written as real characters, not \uXXXX escapes.
      expect(text, `${dir} package.json escapes`).not.toMatch(/\\u[0-9a-fA-F]{4}/);
      const raw = JSON.parse(text) as { files?: string[] };
      const { manifest, warnings } = parsePluginPackage(raw, file);
      expect(warnings, dir).toEqual([]);
      expect(manifest.pluginName, dir).toBe(dir);
      expect(manifest.description, dir).not.toBe("");
      expect(manifest.niceagent.shortDescription, dir).toBeDefined();
      expect(manifest.niceagent.shortDescriptionZh, dir).toBeDefined();
      expect(
        PLUGIN_CATEGORIES.map((c) => c.id),
        dir,
      ).toContain(manifest.niceagent.category);
      const icon = readPluginIcon(path.join(pluginsRoot, dir), manifest.niceagent.icon);
      expect(icon.warnings, dir).toEqual([]);
      expect(icon.icon, `${dir} icon`).toMatch(/^<svg[\s\S]*<\/svg>\s*$/);
      expect(raw.files ?? [], dir).not.toContain("plugin.json");
      expect(existsSync(path.join(pluginsRoot, dir, "plugin.json")), dir).toBe(false);
    }
  });

  it("every library plugin declares a quick start: a demo prompt in both languages, naming only its own skills", () => {
    for (const plugin of loadLibraryPlugins()) {
      const quickStart = plugin.quickStart;
      expect(quickStart, plugin.name).toBeDefined();
      expect(quickStart!.prompt.length, plugin.name).toBeGreaterThan(0);
      expect(quickStart!.promptZh?.length ?? 0, plugin.name).toBeGreaterThan(0);
      for (const skill of quickStart!.skills ?? []) {
        expect(
          plugin.skills.map((s) => s.name),
          plugin.name,
        ).toContain(skill);
      }
    }
    // The goal plugin's demo is a goal: its hooks only run for one.
    expect(libraryPlugin("goal")?.quickStart?.goal).toBe(true);
  });

  it("stamps the plugin's metadata into each skill: its own version in the file, full installable frontmatter", async () => {
    for (const plugin of loadLibraryPlugins()) {
      // Every built-in plugin ships an icon.
      expect(plugin.icon, `${plugin.name} icon`).toBeDefined();
      for (const skill of plugin.skills) {
        const dir = path.join(pluginsRoot, plugin.name, "skills", skill.name);
        const file = await fs.readFile(path.join(dir, "SKILL.md"), "utf8");
        // The library file carries name, description and the skill's own dated version; the
        // short descriptions are the package's, stamped in by the loader.
        const fileFront = /^---\n([\s\S]*?)\n---/.exec(file)![1]!;
        expect(fileFront, `${plugin.name}/${skill.name} file frontmatter`).not.toMatch(
          /^(short_description|short_description_zh):/m,
        );
        expect(parseSkillFrontmatter(file)!.version, `${plugin.name}/${skill.name}`).toMatch(
          PLUGIN_VERSION_PATTERN,
        );
        // The installable content regenerates the frontmatter with the plugin's fields, keeps
        // the skill's own version, and keeps the body verbatim.
        const meta = parseSkillFrontmatter(skill.content)!;
        expect(meta.version, `${plugin.name}/${skill.name} version`).toBe(
          parseSkillFrontmatter(file)!.version,
        );
        expect(skill.version).toBe(meta.version);
        expect(meta.shortDescriptionZh).toBe(plugin.shortDescriptionZh);
        expect(skill.content.endsWith(file.replace(/^---\n[\s\S]*?\n---/, ""))).toBe(true);
        // A skill's icon is its plugin's, stamped by the loader — no skill directory ships
        // an icon.svg of its own.
        expect(skill.icon, `${plugin.name}/${skill.name} icon`).toBe(plugin.icon);
        await expect(fs.access(path.join(dir, "icon.svg"))).rejects.toThrow();
        // Every shipped skill asks before starting when the message only names it.
        expect(skill.content, `${skill.name} lacks ## Before you start`).toMatch(
          /^## Before you start$/m,
        );
      }
    }
  });

  // Whether each SKILL.md parses is each plugin's own test, through the @niceagent/skills
  // package; this one is the library's: it installs into one flat skills/
  // directory, so a second skill of the same name would silently overwrite the first.
  it("ships no skill name from two plugins", () => {
    const owner = new Map<string, string>();
    for (const plugin of loadLibraryPlugins()) {
      for (const skill of plugin.skills) {
        expect(owner.get(skill.name), `${plugin.name}/${skill.name}`).toBeUndefined();
        owner.set(skill.name, plugin.name);
      }
    }
    expect(owner.size).toBeGreaterThan(0);
  });

  it("collects auxiliary files a SKILL.md references (reference/*), excluding SKILL.md and icon.svg", () => {
    const humanizer = librarySkill("humanizer");
    expect(humanizer).toBeDefined();
    const files = humanizer!.skill.files ?? {};
    expect(Object.keys(files).length).toBeGreaterThan(0);
    expect(Object.keys(files).every((rel) => rel !== "SKILL.md" && rel !== "icon.svg")).toBe(true);
    expect(Object.keys(files).some((rel) => rel.startsWith("reference/"))).toBe(true);
  });

  it("ACE, APE, AWM and OPRO ship the same evaluation reference", () => {
    // These four methods share one evaluation protocol. Continuous-training methods have
    // their own worker instructions; keep this check on the copies that must stay identical.
    const toolkits = [
      "ace-rsi-toolkit",
      "ape-rsi-toolkit",
      "awm-rsi-toolkit",
      "opro-rsi-toolkit",
    ].map((name) => libraryPlugin(name)!);
    expect(toolkits.length).toBeGreaterThan(1);
    const references = toolkits.map((plugin) => {
      // One Skill per algorithm toolkit, named like the plugin.
      expect(
        plugin.skills.map((s) => s.name),
        plugin.name,
      ).toEqual([plugin.name]);
      return plugin.skills[0]!.files?.["references/evaluation.md"] ?? "";
    });
    for (const [i, reference] of references.entries()) {
      expect(reference.length, toolkits[i]!.name).toBeGreaterThan(0);
      expect(reference, `${toolkits[i]!.name} vs ${toolkits[0]!.name}`).toBe(references[0]);
    }
  });

  it("a hook plugin carries a manifest naming its scripts and the hooks/ files to install; goal's start runs only when the host starts a goal", async () => {
    const goal = libraryPlugin("goal");
    const pkg = JSON.parse(
      await fs.readFile(path.join(pluginsRoot, "goal", "package.json"), "utf8"),
    ) as { niceagent: { hooks: { version: string } } };
    expect(goal?.hooks?.manifest).toMatchObject({
      name: "goal",
      version: pkg.niceagent.hooks.version,
      stop: [{ command: "stop.mjs", timeout: 60 }],
      pre_tool_use: [],
      user_prompt: [{ command: "start.mjs", timeout: 60, trigger: "host" }],
    });
    expect(goal!.hooks!.manifest.description_zh).toBeDefined();
    expect(Object.keys(goal!.hooks!.files).sort()).toEqual(["lib.mjs", "start.mjs", "stop.mjs"]);
    expect(goal!.skills).toEqual([]);
    const learning = libraryPlugin("continual-learning");
    expect(learning?.hooks?.manifest.stop).toEqual([{ command: "stop.mjs", timeout: 60 }]);
    expect(Object.keys(learning!.hooks!.files)).toEqual(["stop.mjs"]);
  });

  it("a single-skill plugin reads as its own; a merged plugin's skills each resolve to it", () => {
    const plugin = libraryPlugin("data-analysis")!;
    expect(plugin.description.length).toBeGreaterThan(0);
    expect(plugin.skills).toHaveLength(1);
    // Merged plugins carry several skills, each still resolvable by its own name.
    expect(librarySkill("web-design")?.plugin.name).toBe("software-development");
    expect(librarySkill("unified-llm-api")?.plugin.name).toBe("agent-development");
    expect(librarySkill("niceagent-config")?.plugin.name).toBe("agent-development");
    expect(librarySkill("plugin-porting")?.plugin.name).toBe("skill-porting");
    // The default loop's steps sit with their audience: setting up an agent is agent
    // development, measuring one is Agent Evaluation, and the toolkit keeps only the loop.
    expect(librarySkill("agent-initialization")?.plugin.name).toBe("agent-development");
    expect(librarySkill("niceagent-plugin")?.plugin.name).toBe("agent-development");
    expect(librarySkill("agent-evaluation")?.plugin.name).toBe("agent-evaluation");
    expect(librarySkill("benchmark-design")?.plugin.name).toBe("agent-evaluation");
    expect(libraryPlugin("default-rsi-toolkit")?.skills.map((s) => s.name)).toEqual([
      "agent-optimization",
    ]);
  });
});

describe("loadPreinstalledPlugins", () => {
  it("excludes plugins whose manifest sets preinstall: false and keeps everything else", () => {
    const all = loadLibraryPlugins().map((p) => p.name);
    const preinstalled = loadPreinstalledPlugins().map((p) => p.name);
    expect(preinstalled).toContain("goal");
    expect(preinstalled).toContain("software-development");
    for (const manual of ["agent-company", "continual-learning", "humanizer", "use-claude-code"]) {
      expect(all).toContain(manual);
      expect(preinstalled).not.toContain(manual);
    }
  });
});

describe("comparePluginVersions", () => {
  it("orders by date, then by sequence number numerically; non-versions sort before every version", () => {
    expect(comparePluginVersions("2026.08.29.1", "2026.08.29.1")).toBe(0);
    expect(comparePluginVersions("2026.08.29.2", "2026.08.29.10")).toBeLessThan(0);
    expect(comparePluginVersions("2026.09.01.1", "2026.08.29.9")).toBeGreaterThan(0);
    expect(comparePluginVersions("", "2026.08.29.1")).toBeLessThan(0);
    expect(comparePluginVersions("7", "2026.08.29.1")).toBeLessThan(0);
    expect(comparePluginVersions("", "")).toBe(0);
  });

  it("reads the legacy spelling as the same version a copy installed earlier carries", () => {
    expect(comparePluginVersions("2026-08-29.1", "2026.08.29.1")).toBe(0);
    expect(comparePluginVersions("2026.09.10.2", "2026.09.10.1")).toBeGreaterThan(0);
    expect(comparePluginVersions("2026.09.10.1", "2026-09-09.9")).toBeGreaterThan(0);
    expect(comparePluginVersions("2026-09-09.9", "2026.09.09.10")).toBeLessThan(0);
  });
});

describe("groupPlugins / loadPluginGroups", () => {
  it("groups by category in manifest order, members sorted, empty categories omitted, unknown ones in Other", () => {
    const groups = groupPlugins([
      fakePlugin("b", "ai-app-development"),
      fakePlugin("a", "ai-app-development"),
      fakePlugin("z"),
      fakePlugin("y", "made-up"),
      fakePlugin("h", "office-productivity"),
    ]);
    expect(groups.map((g) => [g.id, g.plugins.map((p) => p.name)])).toEqual([
      ["office-productivity", ["h"]],
      ["ai-app-development", ["a", "b"]],
      ["other", ["y", "z"]],
    ]);
    expect(groups[2]).toMatchObject({ title: "Other", titleZh: "其他" });
  });

  it("the library itself fills every category but Agent Sandbox and leaves no Other group; hook packages sit with their audience", () => {
    const groups = loadPluginGroups();
    // The sandbox backends are server modules the registry lists, not library content.
    expect(groups.map((g) => g.id)).toEqual(
      PLUGIN_CATEGORIES.map((c) => c.id).filter((id) => id !== "sandbox"),
    );
    const names = (id: string) => groups.find((g) => g.id === id)?.plugins.map((p) => p.name);
    expect(names("rsi")).toEqual([
      "ace-rsi-toolkit",
      "ape-rsi-toolkit",
      "awm-rsi-toolkit",
      "default-rsi-toolkit",
      "openskill-rsi-toolkit",
      "opro-rsi-toolkit",
      "skilladam-rsi-toolkit",
      "skillopt-rsi-toolkit",
      "trace-rsi-toolkit",
    ]);
    expect(names("office-productivity")).toEqual([
      "a2ui",
      "agent-company",
      "browser-automation",
      "continual-learning",
      "data-analysis",
      "goal",
      "humanizer",
      "agent-support",
      "use-bento-slides",
      "use-firecrawl",
    ]);
    expect(names("ai-app-development")).toEqual([
      "agent-development",
      "agent-evaluation",
      "model-development",
      "skill-porting",
      "niceagent",
    ]);
  });
});

describe("lookups", () => {
  it("libraryPlugin and librarySkill find by name; illegal names never touch the filesystem", () => {
    expect(libraryPlugin("goal")?.name).toBe("goal");
    expect(libraryPlugin("does-not-exist")).toBeUndefined();
    expect(libraryPlugin("../etc")).toBeUndefined();
    expect(librarySkill("goal")).toBeUndefined();
    expect(librarySkill("..")).toBeUndefined();
  });
});

/** Writes `files` under `dir` (paths relative to it; a Uint8Array is written as bytes). */
async function write(dir: string, files: Record<string, string | Uint8Array>): Promise<void> {
  for (const [rel, data] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(dir, rel)), { recursive: true });
    await fs.writeFile(path.join(dir, rel), data);
  }
}

describe("plugin versions, on a fixture library", () => {
  let root: string | null = null;

  afterEach(async () => {
    usePushedPluginLibrary(null);
    if (root !== null) await fs.rm(root, { recursive: true, force: true });
    root = null;
  });

  /** A host package holding one plugin, `@niceagent/sample`, made of `files` (paths relative to the plugin directory); the library is pointed at it. */
  async function library(files: Record<string, string>): Promise<void> {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "niceagent-plugin-versions-"));
    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "fixture-host", dependencies: { "@niceagent/sample": "*" } }),
    );
    await write(path.join(root, "node_modules", "@niceagent", "sample"), files);
    usePushedPluginLibrary(root);
  }

  const skillFile = (name: string, version?: string) =>
    `---\nname: ${name}\ndescription: Do ${name}.\n${version === undefined ? "" : `version: ${version}\n`}---\n\n## Before you start\n`;
  /** The sample package's package.json: its npm fields and a `niceagent` block. */
  const pkg = (niceagent: Record<string, unknown> = {}) =>
    JSON.stringify({
      name: "@niceagent/sample",
      version: "3.1.4",
      description: "Sample.",
      niceagent: { short_description: "Short.", short_description_zh: "短。", ...niceagent },
    });

  it("keeps each skill's own dated version through the stamp, gives the hook package niceagent.hooks.version, and the plugin its npm version", async () => {
    await library({
      "package.json": pkg({ hooks: { version: "2026.09.02.3", stop: [{ command: "stop.mjs" }] } }),
      "skills/one/SKILL.md": skillFile("one", "2026.09.01.2"),
      "skills/two/SKILL.md": skillFile("two", "2026.08.15.1"),
      "hooks/stop.mjs": "export {};\n",
    });
    const plugin = libraryPlugin("sample")!;
    expect(plugin.version).toBe("3.1.4");
    expect(plugin.skills.map((s) => [s.name, s.version])).toEqual([
      ["one", "2026.09.01.2"],
      ["two", "2026.08.15.1"],
    ]);
    // What an install writes carries the same version, beside the stamped short description.
    for (const skill of plugin.skills) {
      expect(parseSkillFrontmatter(skill.content)).toMatchObject({
        version: skill.version,
        shortDescription: "Short.",
      });
    }
    expect(plugin.hooks?.manifest.version).toBe("2026.09.02.3");
  });

  it("refuses a shipped skill without a dated version, and shipped hooks/ without niceagent.hooks.version, naming the file", async () => {
    await library({
      "package.json": pkg(),
      "skills/one/SKILL.md": skillFile("one"),
    });
    expect(() => libraryPlugin("sample")).toThrow(/skills[/\\]one[/\\]SKILL\.md: version/);
    await fs.rm(root!, { recursive: true, force: true });

    await library({
      "package.json": pkg({ hooks: { stop: [] } }),
      "hooks/stop.mjs": "export {};\n",
    });
    expect(() => libraryPlugin("sample")).toThrow(/package\.json: .*niceagent\.hooks\.version/);
  });

  it("fails the library for a shipped package with any warning-level fault, naming the key", async () => {
    await library({
      "package.json": pkg({ category: 7 }),
      "skills/one/SKILL.md": skillFile("one", "2026.09.01.2"),
    });
    expect(() => loadLibraryPlugins()).toThrow(/package\.json: niceagent\.category must be a string/);
    await fs.rm(root!, { recursive: true, force: true });

    await library({
      "package.json": pkg({ mcp_servers: [{ name: "nowhere", config: { transport: "ws" } }] }),
      "skills/one/SKILL.md": skillFile("one", "2026.09.01.2"),
    });
    expect(() => loadLibraryPlugins()).toThrow(/niceagent\.mcp_servers: server "nowhere"/);
  });
});

describe("packages the operator installed on the server", () => {
  let root: string | null = null;

  afterEach(async () => {
    usePushedPluginLibrary(null);
    useInstalledPluginPrefix(null);
    vi.restoreAllMocks();
    if (root !== null) await fs.rm(root, { recursive: true, force: true });
    root = null;
  });

  const skillFile = (name: string, version?: string) =>
    `---\nname: ${name}\ndescription: Do ${name}.\n${version === undefined ? "" : `version: ${version}\n`}---\n\nBody.\n`;

  /**
   * A shipped library of one plugin (`@niceagent/sample`) and a server prefix whose
   * package.json depends on `installed`; every package is written under node_modules.
   */
  async function setUp(
    installed: string[],
    packages: Record<string, Record<string, string | Uint8Array>>,
  ): Promise<void> {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "niceagent-installed-plugins-"));
    const host = path.join(root, "host");
    await write(host, {
      "package.json": JSON.stringify({
        name: "host",
        dependencies: { "@niceagent/sample": "*" },
      }),
      "node_modules/@niceagent/sample/package.json": JSON.stringify({
        name: "@niceagent/sample",
        version: "1.0.0",
        description: "Sample.",
      }),
      "node_modules/@niceagent/sample/skills/sample/SKILL.md": skillFile(
        "sample",
        "2026.09.01.1",
      ),
    });
    const prefix = path.join(root, "prefix");
    await write(prefix, {
      "package.json": JSON.stringify({
        name: "niceagent-plugins",
        private: true,
        dependencies: Object.fromEntries(installed.map((name) => [name, "*"])),
      }),
    });
    for (const [name, files] of Object.entries(packages)) {
      await write(path.join(prefix, "node_modules", ...name.split("/")), files);
    }
    usePushedPluginLibrary(host);
    useInstalledPluginPrefix(prefix);
  }

  const notes = (name: string, niceagent: Record<string, unknown> = {}) => ({
    "package.json": JSON.stringify({
      name,
      version: "2.0.0",
      description: "Notes.",
      niceagent: { preinstall: true, ...niceagent },
    }),
    "skills/notes/SKILL.md": skillFile("notes", "2026.10.01.1"),
  });

  /** The warnings the loader logged, as one string. */
  const logged = (warn: { mock: { calls: unknown[][] } }) =>
    warn.mock.calls.map((call) => String(call[0])).join("\n");

  it("lists a package of Skills the operator installed, as installed and never preinstalled", async () => {
    await setUp(["vacme/notes"], { "vacme/notes": notes("vacme/notes") });
    expect(loadLibraryPlugins().map((p) => [p.name, p.packageName, p.source])).toEqual([
      ["notes", "vacme/notes", "installed"],
      ["sample", "@niceagent/sample", undefined],
    ]);
    expect(libraryPlugin("notes")).toMatchObject({ version: "2.0.0", preinstall: false });
    expect(loadPreinstalledPlugins().map((p) => p.name)).toEqual(["sample"]);
    expect(libraryPluginPackage("notes")).toMatchObject({
      packageName: "vacme/notes",
      version: "2.0.0",
    });
  });

  it("leaves out a package of server modules alone, a name the build ships, and npm's own dependencies", async () => {
    await setUp(["vacme/sandbox-x", "vother/sample", "vacme/nothing"], {
      // A server module's card: a niceagent block, with nothing to install into an Agent.
      "vacme/sandbox-x": {
        "package.json": JSON.stringify({
          name: "vacme/sandbox-x",
          version: "1.0.0",
          niceagent: { category: "sandbox" },
        }),
        "ifaces.json": "{}",
      },
      "vother/sample": notes("vother/sample"),
      // An empty server list is no content.
      "vacme/nothing": {
        "package.json": JSON.stringify({
          name: "vacme/nothing",
          version: "1.0.0",
          niceagent: { mcp_servers: [] },
        }),
      },
      // Installed by npm beside the packages the prefix asked for, not by the operator.
      "left-pad": notes("left-pad"),
    });
    expect(loadLibraryPlugins().map((p) => [p.name, p.packageName])).toEqual([
      ["sample", "@niceagent/sample"],
    ]);
  });

  it("leaves an installed package that will not read out, with a warning, and still loads the library", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await setUp(["vacme/broken", "vacme/notes"], {
      // No release version: nothing can say which version of it is installed.
      "vacme/broken": {
        "package.json": JSON.stringify({ name: "vacme/broken", description: "Broken." }),
        "skills/broken/SKILL.md": skillFile("broken", "2026.10.01.1"),
      },
      "vacme/notes": notes("vacme/notes"),
    });
    expect(loadLibraryPlugins().map((p) => p.name)).toEqual(["notes", "sample"]);
    expect(libraryPlugin("broken")).toBeUndefined();
    expect(logged(warn)).toContain("vacme/broken is installed but not listed");
  });

  it("reads a package whose package.json carries only a name and a version: its skills, and nothing invented", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await setUp(["bare"], {
      bare: {
        "package.json": JSON.stringify({ name: "bare", version: "0.1.0" }),
        "skills/bare/SKILL.md": skillFile("bare", "2026.10.01.1"),
      },
    });
    const bare = libraryPlugin("bare")!;
    expect(bare).toMatchObject({ name: "bare", version: "0.1.0", description: "" });
    for (const key of ["title", "shortDescription", "category", "icon", "quickStart", "hooks"]) {
      expect(bare, key).not.toHaveProperty(key);
    }
    expect(bare.skills.map((s) => s.name)).toEqual(["bare"]);
    expect(
      loadPluginGroups()
        .find((g) => g.id === "other")
        ?.plugins.map((p) => p.name),
    ).toContain("bare");
    // Absent is not a fault: nothing to warn about.
    expect(warn).not.toHaveBeenCalled();
  });

  it("lists through what a shipped package fails on, with the field missing and a warning", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await setUp(["vacme/notes"], {
      "vacme/notes": notes("vacme/notes", {
        category: ["office-productivity"],
        title: "Notes",
        quick_start: { prompt: "Take a note.", skills: ["notes", "elsewhere"] },
      }),
    });
    const plugin = libraryPlugin("notes")!;
    expect(plugin.title).toBe("Notes");
    expect(plugin).not.toHaveProperty("category");
    expect(plugin.quickStart).toEqual({ prompt: "Take a note.", skills: ["notes"] });
    expect(logged(warn)).toContain("niceagent.category must be a string; ignored");
    expect(logged(warn)).toContain("names skills the package does not ship (elsewhere)");
  });

  it("lists the skills of a package whose hooks/ has no niceagent.hooks.version, and no hook package", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await setUp(["vacme/notes"], {
      "vacme/notes": { ...notes("vacme/notes"), "hooks/stop.mjs": "export {};\n" },
    });
    const plugin = libraryPlugin("notes")!;
    expect(plugin.skills.map((s) => s.name)).toEqual(["notes"]);
    expect(plugin.hooks).toBeUndefined();
    expect(logged(warn)).toContain("hooks/ is present but package.json declares no niceagent.hooks");
  });

  it("reads a skill without a version as unversioned, which its installed copy is never behind", async () => {
    await setUp(["vacme/notes"], {
      "vacme/notes": {
        ...notes("vacme/notes"),
        "skills/notes/SKILL.md": skillFile("notes"),
      },
    });
    const [skill] = libraryPlugin("notes")!.skills;
    expect(skill!.version).toBe("");
    // What an install writes carries no version either, and compares equal to the library's.
    const installed = parseSkillFrontmatter(skill!.content)!;
    expect(skill!.content).not.toMatch(/^version:/m);
    expect(comparePluginVersions(installed.version, skill!.version)).toBe(0);
  });

  it("drops an icon with a script, an event handler or over 64 KiB, and keeps a plain one", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const plain = `<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 2h20v20H2z"/></svg>\n`;
    const unsafe = {
      script: `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`,
      handler: `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><path d="M0 0"/></svg>`,
      large: `<svg xmlns="http://www.w3.org/2000/svg"><path d="${"M0 0 ".repeat(14_000)}"/></svg>`,
      link: `<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.invalid/t.png"/></svg>`,
    };
    await setUp(
      ["vacme/plain", ...Object.keys(unsafe).map((k) => `vacme/${k}`)],
      Object.fromEntries([
        ["vacme/plain", { ...notes("vacme/plain"), "icon.svg": plain }],
        ...Object.entries(unsafe).map(([k, svg]) => [
          `vacme/${k}`,
          { ...notes(`vacme/${k}`, { icon: "art/logo.svg" }), "art/logo.svg": svg },
        ]),
      ]),
    );
    const icons = Object.fromEntries(loadLibraryPlugins().map((p) => [p.name, p.icon]));
    // Kept from its <svg> root on: the Web App inlines only markup that begins there.
    expect(icons.plain).toBe(plain.slice(plain.indexOf("<svg")));
    for (const name of Object.keys(unsafe)) expect(icons[name], name).toBeUndefined();
    // A skill of a package without an icon installs without one (the book glyph).
    expect(libraryPlugin("script")!.skills[0]).not.toHaveProperty("icon");
    expect(logged(warn)).toContain("is larger than 64 KiB");
    expect(isSafeIconSvg(unsafe.script)).toBe(false);
  });

  it("leaves a binary file out of a skill, and installs the text files beside it as they are, a byte-order mark included", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0xfe]);
    await setUp(["vacme/notes"], {
      "vacme/notes": {
        ...notes("vacme/notes"),
        "skills/notes/assets/logo.png": png,
        "skills/notes/references/api.md": "# API\n",
        "skills/notes/scripts/setup.ps1": "﻿Write-Output 'ready'\n",
      },
    });
    const [skill] = libraryPlugin("notes")!.skills;
    expect(Object.keys(skill!.files ?? {}).sort()).toEqual([
      "references/api.md",
      "scripts/setup.ps1",
    ]);
    expect(skill!.files?.["scripts/setup.ps1"]).toBe("﻿Write-Output 'ready'\n");
    expect(logged(warn)).toContain("skills/notes/assets/logo.png is not a text file");
  });

  it("leaves out a skill directory whose name is not a skill name, with a warning, and lists the rest", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await setUp(["vacme/notes"], {
      "vacme/notes": {
        ...notes("vacme/notes"),
        "skills/pdf.tools/SKILL.md": skillFile("pdf.tools", "2026.10.01.1"),
      },
    });
    // What the library lists is what an install writes: nothing an Agent's skills folder refuses.
    expect(libraryPlugin("notes")!.skills.map((s) => s.name)).toEqual(["notes"]);
    expect(logged(warn)).toContain("skills/pdf.tools is not a skill name");
  });

  it("lists an old package that still carries a plugin.json by its directories, reading nothing from it", async () => {
    await setUp(["@niceagent/old"], {
      "@niceagent/old": {
        "package.json": JSON.stringify({
          name: "@niceagent/old",
          version: "0.2.13",
          description: "Old.",
        }),
        "plugin.json": JSON.stringify({
          description: "Old, described by plugin.json.",
          description_zh: "旧插件。",
          category: "office-productivity",
          hooks: { version: "2026.10.04.1", stop: [{ command: "stop.mjs" }] },
        }),
        "icon.svg": `<svg xmlns="http://www.w3.org/2000/svg"></svg>\n`,
        "skills/old/SKILL.md": skillFile("old", "2026.10.01.1"),
        "hooks/stop.mjs": "export {};\n",
      },
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const old = libraryPlugin("old")!;
    expect(old).toMatchObject({ description: "Old.", version: "0.2.13" });
    expect(old.icon).toBeDefined();
    expect(old.skills.map((s) => s.name)).toEqual(["old"]);
    for (const key of ["descriptionZh", "category", "hooks"])
      expect(old, key).not.toHaveProperty(key);
  });

  it("lists a package of MCP servers alone, each server with every vault key it references", async () => {
    const config = {
      transport: "http",
      url: "https://mail.example.com/mcp",
      headers: { "X-Team": "${MAIL_TEAM}" },
      oauth: {
        scopes: ["mail.read"],
        client_id: "${MAIL_CLIENT_ID}",
        client_secret: "${MAIL_CLIENT_SECRET}",
      },
    };
    await setUp(["vacme/mail"], {
      "vacme/mail": {
        "package.json": JSON.stringify({
          name: "vacme/mail",
          version: "0.1.9",
          description: "Mail.",
          niceagent: {
            mcp_servers: [
              {
                name: "mail",
                config,
                setup: [
                  {
                    key: "MAIL_CLIENT_ID",
                    label: "OAuth client ID",
                    label_zh: "OAuth 客户端 ID",
                    help: "https://console.example.com/credentials",
                  },
                ],
              },
            ],
          },
        }),
      },
    });
    const dir = path.join(root!, "prefix", "node_modules", "vacme", "mail");
    expect(libraryParts(dir)).toEqual({
      skills: false,
      hooks: false,
      mcp: true,
      workbenches: false,
    });
    const mail = libraryPlugin("mail")!;
    expect(mail).toMatchObject({ source: "installed", version: "0.1.9", skills: [] });
    expect(mail.hooks).toBeUndefined();
    expect(mail.mcpServers).toEqual([
      {
        name: "mail",
        config,
        oauth: true,
        setup: [
          {
            key: "MAIL_CLIENT_ID",
            label: "OAuth client ID",
            labelZh: "OAuth 客户端 ID",
            help: "https://console.example.com/credentials",
          },
          { key: "MAIL_TEAM" },
          { key: "MAIL_CLIENT_SECRET" },
        ],
      },
    ]);
  });

  it("drops a server entry the resolver refuses, a bad or repeated server name and an unreferenced setup key, one warning each", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await setUp(["vacme/tools"], {
      "vacme/tools": {
        "package.json": JSON.stringify({
          name: "vacme/tools",
          version: "1.0.0",
          niceagent: {
            mcp_servers: [
              { name: "local", config: { command: "node", args: ["${PLUGIN_ROOT}/server.mjs"] } },
              { name: "nowhere", config: { transport: "ws", url: "wss://tools.example.com" } },
              { name: "moving", config: { url: "https://${TOOLS_HOST}/mcp" } },
              { name: "bad name", config: { command: "x" } },
              { name: "local", config: { command: "again" } },
              { name: "extra", config: { command: "x" }, setup: [{ key: "UNUSED" }] },
            ],
          },
        }),
      },
    });
    expect(libraryPlugin("tools")!.mcpServers.map((s) => [s.name, s.setup])).toEqual([
      ["local", []],
      ["extra", []],
    ]);
    const said = logged(warn);
    expect(said).toContain('server "nowhere": unknown transport');
    expect(said).toContain('server "moving"');
    expect(said).toContain("niceagent.mcp_servers[3].name must be a server name");
    expect(said).toContain('the server name "local" is used twice');
    expect(said).toContain("setup key UNUSED, which its config never references");
  });

  it("reads a local package directory the way the library will (readLibraryPackage), refusing one without a release version", async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "niceagent-library-package-"));
    await write(path.join(root, "ok"), notes("vacme/notes"));
    await write(path.join(root, "bad"), {
      "package.json": JSON.stringify({ name: "vacme/bad", version: "next" }),
      "skills/bad/SKILL.md": skillFile("bad", "2026.10.01.1"),
    });
    expect(readLibraryPackage(path.join(root, "ok"))).toMatchObject({
      name: "notes",
      packageName: "vacme/notes",
      source: "installed",
    });
    expect(() => readLibraryPackage(path.join(root!, "bad"))).toThrow(
      /package\.json: the package carries no release version/,
    );
  });
});

describe("parseSkillFrontmatter", () => {
  it("parses name/description/version and the optional short descriptions; values may contain colons", () => {
    const meta = parseSkillFrontmatter(
      "---\nname: x\ndescription: a: b\nshort_description: s\nshort_description_zh: 中\nversion: 2026.08.29.3\n---\nbody",
    );
    expect(meta).toEqual({
      name: "x",
      description: "a: b",
      shortDescription: "s",
      shortDescriptionZh: "中",
      version: "2026.08.29.3",
    });
  });

  it("keeps the legacy version spelling an installed copy from before the rename carries", () => {
    expect(parseSkillFrontmatter("---\nname: x\nversion: 2026-08-29.3\n---\nbody")).toEqual({
      name: "x",
      description: "",
      version: "2026-08-29.3",
    });
  });

  it("tolerates a BOM and CRLF, drops a malformed version to the empty string, and needs a name", () => {
    expect(parseSkillFrontmatter("﻿---\r\nname: x\r\nversion: 9\r\n---\r\nbody")).toEqual({
      name: "x",
      description: "",
      version: "",
    });
    expect(parseSkillFrontmatter("no frontmatter")).toBeNull();
    expect(parseSkillFrontmatter("---\ndescription: d\n---\n")).toBeNull();
  });

  it("reads frontmatter as YAML: a quoted value is read without its quotes", () => {
    expect(
      parseSkillFrontmatter(
        "---\nname: x\ndescription: \"Use it when: the user asks\"\nshort_description: 's: t'\nversion: 2026.08.29.3\n---\nbody",
      ),
    ).toEqual({
      name: "x",
      description: "Use it when: the user asks",
      shortDescription: "s: t",
      version: "2026.08.29.3",
    });
    // A multi-line YAML value is read whole, not cut at its first line.
    expect(
      parseSkillFrontmatter(
        "---\nname: x\ndescription: >-\n  first line\n  second line\nshort_description: |-\n  a\n  b\n---\nbody",
      ),
    ).toEqual({
      name: "x",
      description: "first line second line",
      shortDescription: "a\nb",
      version: "",
    });
    // A block that is not a mapping is no frontmatter.
    expect(parseSkillFrontmatter("---\n- name\n---\nbody")).toBeNull();
  });

  it("still reads an older installed copy whose unquoted value is not valid YAML", () => {
    // Written by the line-based stamper before frontmatter was YAML: the unquoted ": " is a
    // YAML error, so the block is read line by line as before.
    const old =
      "---\nname: niceagent-sdk\ndescription: Build agents: the SDK, its hooks: and more\nshort_description: SDK\nversion: 2026.09.20.2\n---\n\n# Body\n";
    expect(() => parseYaml(/^---\n([\s\S]*?)\n---/.exec(old)![1]!)).toThrow();
    expect(parseSkillFrontmatter(old)).toEqual({
      name: "niceagent-sdk",
      description: "Build agents: the SDK, its hooks: and more",
      shortDescription: "SDK",
      version: "2026.09.20.2",
    });
  });

  it("stamps the installed copy's frontmatter as YAML that reads back to the same metadata", () => {
    const fields = {
      name: "x",
      description: `Use it when: the user says "go" and 'stop' — ${"a long description ".repeat(12)}`,
      short_description: "- starts with a dash",
      short_description_zh: "中文：说明 #1",
      version: "2026.08.29.3",
    };
    const front = formatFrontmatter(fields);
    expect(front.startsWith("---\n")).toBe(true);
    expect(front.endsWith("\n---")).toBe(true);
    // One line per field, in order: a long description is not folded.
    expect(front.split("\n").map((line) => line.split(":")[0])).toEqual([
      "---",
      "name",
      "description",
      "short_description",
      "short_description_zh",
      "version",
      "---",
    ]);
    expect(parseYaml(front.slice(4, -3))).toEqual(fields);
    expect(parseSkillFrontmatter(`${front}\n\n# Body\n`)).toEqual({
      name: "x",
      description: fields.description,
      shortDescription: fields.short_description,
      shortDescriptionZh: fields.short_description_zh,
      version: "2026.08.29.3",
    });
    // An absent optional field is left out.
    expect(formatFrontmatter({ name: "x", description: "d", short_description: undefined })).toBe(
      "---\nname: x\ndescription: d\n---",
    );
    // Every built-in skill's installable content carries a valid YAML block that reads back
    // to the stamped metadata.
    for (const plugin of loadLibraryPlugins()) {
      for (const skill of plugin.skills) {
        const block = /^---\n([\s\S]*?)\n---/.exec(skill.content)![1]!;
        const parsed = parseYaml(block, { schema: "failsafe" }) as Record<string, string>;
        expect(parsed["description"], `${skill.name} description`).toBe(skill.description);
        expect(parsed["version"] ?? "").toBe(skill.version);
      }
    }
  });
});

describe("workspacePluginRoot (a checkout reads plugins from the repo's plugins/ directory)", () => {
  /** A workspace checkout as pnpm lays it out: the repo root, its plugins/, and an injected copy of a plugin under .pnpm. */
  async function checkout(opts: { workspaceFile: boolean; packageName: string }) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "niceagent-plugin-root-"));
    if (opts.workspaceFile)
      await fs.writeFile(path.join(root, "pnpm-workspace.yaml"), "packages:\n");
    const source = path.join(root, "plugins", "sample");
    await fs.mkdir(source, { recursive: true });
    await fs.writeFile(
      path.join(source, "package.json"),
      JSON.stringify({ name: opts.packageName }),
    );
    const injected = path.join(
      root,
      "node_modules/.pnpm/@niceagent+sample@file+plugins+sample/node_modules/@niceagent/sample",
    );
    await fs.mkdir(injected, { recursive: true });
    // Where core itself sits in that checkout: its own injected copy, deep under .pnpm.
    const core = path.join(
      root,
      "node_modules/.pnpm/@niceagent+niceagent-core@file+packages+core/node_modules/@niceagent/core",
    );
    await fs.mkdir(core, { recursive: true });
    return { root, source, injected, core };
  }

  it("prefers the repo's plugins/<name>/ over pnpm's injected copy inside a workspace checkout", async () => {
    const c = await checkout({ workspaceFile: true, packageName: "@niceagent/sample" });
    try {
      expect(workspacePluginRoot("sample", c.injected, c.core)).toBe(c.source);
    } finally {
      await fs.rm(c.root, { recursive: true, force: true });
    }
  });

  it("keeps the resolved copy outside a workspace: an npm install and the packed app have no workspace file", async () => {
    const c = await checkout({ workspaceFile: false, packageName: "@niceagent/sample" });
    try {
      expect(workspacePluginRoot("sample", c.injected, c.core)).toBe(c.injected);
    } finally {
      await fs.rm(c.root, { recursive: true, force: true });
    }
  });

  it("keeps the resolved copy when the workspace directory is not that package", async () => {
    const c = await checkout({ workspaceFile: true, packageName: "@niceagent/other" });
    try {
      expect(workspacePluginRoot("sample", c.injected, c.core)).toBe(c.injected);
    } finally {
      await fs.rm(c.root, { recursive: true, force: true });
    }
  });

  it("the live loader reads this checkout's plugins/ directories, not copies under node_modules", () => {
    // The whole point, on the real tree: every library plugin's files come from the repo.
    for (const plugin of loadLibraryPlugins()) {
      expect(libraryPluginPackage(plugin.name)?.dir).toBe(path.join(pluginsRoot, plugin.name));
    }
  });
});

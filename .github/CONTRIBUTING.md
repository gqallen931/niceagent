# Contributing to NiceAgent

Thanks for taking the time to contribute. This document covers the local loop, the conventions
this repository follows, and what a good pull request looks like.

[中文版](CONTRIBUTING.zh.md)

## Prerequisites

- Node.js **24** or newer
- pnpm **11** (`corepack enable` is the easiest way to get the pinned version)
- Git

## Getting started

```bash
git clone https://github.com/gqallen931/niceagent.git
cd niceagent
pnpm install
pnpm build          # every package, then links the CLI
pnpm dev            # API on 127.0.0.1:7368, Web App on 127.0.0.1:7365
```

The dev Web App proxies `/api` to the dev server, so sign-in, SSE and WebSockets work
same-origin. The development ports are deliberately different from an installed server's
`7364`, so a release and a checkout can run side by side.

Useful entry points:

```bash
pnpm niceagent --help        # the CLI from source (its own data root: ~/.niceagent/dev-data-cli)
pnpm dev:server              # the API alone
pnpm dev:web                 # Vite alone (expects the API on 7368)
```

## Repository layout

| Path | What lives there |
| --- | --- |
| `packages/amsp` | The record protocol shared by every surface |
| `packages/core` | The agent loop, interfaces, hooks, skills, plugin loader, trace writer |
| `packages/server` | HTTP + SSE, auth, storage, session runtime, terminals, benchmarks |
| `packages/web` | The React Web App |
| `packages/cli` | The `niceagent` command |
| `packages/skills` | SKILL.md parsing and frontmatter helpers |
| `packages/hmr` | Hot-update primitives for the running platform |
| `packages/ui` | Shared UI primitives and design tokens |
| `plugins/*` | The shipped plugin library (skills, hooks, MCP servers, workbenches) |
| `benchmarks/*` | Benchmark cases and rubrics |
| `scripts/*` | Build, codegen and repository tooling |

The dependency direction is `web`/`cli` → `server` → `core` → `amsp`. Core must never import the
server, and the server must never import the Web App.

## Checks before a pull request

```bash
pnpm format:check    # Prettier
pnpm lint            # oxlint
pnpm typecheck       # gen:ifaces + tsc in every package
pnpm test            # vitest
pnpm build           # every package builds
```

CI runs the same gates on Linux, macOS and Windows. A change that only touches one platform still
has to leave the others green.

## Data roots

Everything the runtime writes lives under `NICEAGENT_HOME` (default `~/.niceagent/data`):

- `pnpm dev` and `pnpm dev:server` share `~/.niceagent/dev-data`.
- `pnpm niceagent` uses `~/.niceagent/dev-data-cli` so it never fights the dev server for a lock.
- Tests use a temporary root and an in-memory database; they never touch your data.

Delete a session or an agent from the UI rather than the filesystem when you are testing, then read
its trace to understand what the engine recorded.

## Plugins

A plugin is an ordinary npm package under `plugins/<name>`:

```json
{
  "name": "@niceagent/example",
  "version": "0.2.18",
  "niceagent": {
    "title": "Example",
    "category": "office-productivity",
    "skills": ["example"]
  }
}
```

Rules that review will check:

- A skill's `SKILL.md` frontmatter carries `name`, `description` and a dated `version`
  (`YYYY.MM.DD.N`). Installing copies those files; the version is what tells an installed copy that
  something changed.
- A plugin that is installable must be listed in the category manifest and, when it ships content
  the platform preinstalls, in the built-in agent presets.
- Plugin manifests are read leniently only for operator-installed plugins; the shipped ones fail
  loudly with their path.

## Commit and pull request conventions

- Keep a pull request to one concern. A refactor and a behaviour change in one diff is two reviews.
- Explain *why* in the commit body, not just *what*.
- Include the commands you ran and their result in the PR description.
- Update `CHANGELOG.md` for user-visible changes (features, fixes, breaking changes).
- Add or update tests for behaviour changes. Tests that only touch the UI belong beside the
  component; engine tests go in `packages/core/test`.

## Releasing

Releases are cut from `main` by a maintainer:

1. Move `CHANGELOG.md` entries under a new version heading.
2. Bump the version in every `package.json` (the packages share one version).
3. Tag `vX.Y.Z` and push the tag.
4. CI builds and publishes the Docker image; npm packages are published from the same commit with
   `pnpm -r publish`.

## Community

- Questions and usage help: [GitHub Discussions](https://github.com/gqallen931/niceagent/discussions)
- Bugs and feature requests: GitHub issues (use the templates)
- Security problems: **never** in a public issue — see [SECURITY.md](SECURITY.md)

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).


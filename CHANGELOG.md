# Changelog

All notable changes to NiceAgent are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.18] — 2026-11-02

The first public release of NiceAgent: a general-purpose, self-hostable agent framework.

### Added

- **Core** (`@niceagent/core`): a streaming agent loop over AMSP records, swappable
  `LLMInterface` / `EnvironmentInterface`, concurrent tool execution, per-call approvals,
  interrupts, automatic reconnect and context compaction.
- **Protocol** (`@niceagent/amsp`): the record types and markers shared by the SDK, the server,
  the CLI and the Web App.
- **Server** (`@niceagent/server`): Hono HTTP + SSE, multi-user auth, per-project authorization,
  a session runtime, schedules, server-owned pty terminals, usage accounting, traces, plugin
  installation and benchmark execution.
- **Web App** (`@niceagent/web`): chat, agents, plugins, models, machines, cost center, evaluation
  center, organization mode, workbenches and a standalone terminal.
- **CLI** (`@niceagent/cli`): `niceagent` with REPL, one-shot runs, configuration, session/agent/
  project management, cost, schedules, the agent browser and `niceagent web`.
- **Plugin library**: 29 plugin packages — skills, hooks, MCP servers and workbench pages —
  versioned with the release and installed per agent.
- **Evaluation Center**: benchmark cases with rubrics, per-case traces and scoreboards.
- **Sandbox backends**: `bwrap`, `seatbelt`, `WSL` and `DSH` confinement for tool execution.
- **Deployment**: a multi-stage Dockerfile, a compose file, and first-boot admin claiming.

### Changed

- Nothing yet — this is the first release.

### Fixed

- Nothing yet — this is the first release.

### Security

- Password hashing with `scrypt`, hashed session tokens, same-origin write checks, `Origin`
  checks on stream WebSockets, and opt-in sandboxed tool execution.

[Unreleased]: https://github.com/gqallen931/niceagent/compare/v0.2.18...HEAD
[0.2.18]: https://github.com/gqallen931/niceagent/releases/tag/v0.2.18

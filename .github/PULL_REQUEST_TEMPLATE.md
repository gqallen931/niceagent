## What this changes

<!--
One or two sentences on what the change does and why it was needed. English, the
repository's working language. Add `Closes <full issue URL>` if it answers a report — a
bare `#N` is ambiguous here, because issues and pull requests share one numbering space.
-->

## Verification

<!--
What you ran, and what it said. Pick the narrowest evidence that would have failed without
this change; the full chain CI runs is `pnpm build`, `pnpm format:check`, `pnpm typecheck`,
`pnpm test`, `sh scripts/test-installer.sh`, on Node >= 24.
-->

## Checklist

- [ ] A `CHANGELOG.md` entry under `Unreleased` (and the matching `CHANGELOG.zh.md` line) for user-visible changes.
- [ ] Docs updated where this changes documented behavior (`README*.md`, `docs/`, `packages/*/README.md`).
- [ ] No API key, bot token or other credential in the diff, the logs, or the screenshots.

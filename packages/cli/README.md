# @niceagent/cli

The NiceAgent command line. Installs the `niceagent` command: an interactive REPL, a one-shot task runner, model / vault configuration, and the launcher for the Web service.

```bash
npm install -g @niceagent/cli   # requires Node >= 24
```

```bash
niceagent web        # start the Web service and open http://127.0.0.1:7364
niceagent server     # same service, headless

niceagent config model add --model-id deepseek-v4-pro --api-key sk-... --set-default

niceagent run -m "Create hello.txt containing Hello, NiceAgent"    # one Task, then exit
niceagent chat                                                   # REPL: /compact, /clear, /exit, Ctrl-C interrupts
niceagent chat --resume                                          # resume the latest session
```

Tool calls go through an approval gate — `--approve allow-all` (default) `| deny-all | read-only | always-ask`. Data lives under `~/.niceagent/data` (`NICEAGENT_HOME` or `--root` override); model credentials come from the Project config or provider env vars (e.g. `DEEPSEEK_API_KEY`).

Prefer a one-line install with a bundled Node runtime? See [Quickstart → CLI and Web App](https://github.com/gqallen931/niceagent#quick-start).

## Documentation

- [Quickstart](https://github.com/gqallen931/niceagent#quick-start)
- [CLI Reference](https://github.com/gqallen931/niceagent/tree/main/docs/cli)
- [Configuration Reference](https://github.com/gqallen931/niceagent/tree/main/docs/configuration)

## Development

```bash
pnpm niceagent <args>                              # run from source (repo root, via tsx)
pnpm --filter @niceagent/cli build     # tsup → dist/index.js (the niceagent bin)
pnpm --filter @niceagent/cli typecheck
pnpm --filter @niceagent/cli test
```

Part of [NiceAgent](https://github.com/gqallen931/niceagent) · Apache-2.0

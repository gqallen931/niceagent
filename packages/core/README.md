# @niceagent/core

The NiceAgent SDK and execution engine: the ReAct loop (`context_engine`), the LLM / Environment interface contracts, Agent State and append-only Traces. Its messages are AMSP records, defined in [`@niceagent/amsp`](https://www.npmjs.com/package/@niceagent/amsp) and re-exported from this package's root.

The engine speaks only AMSP records and delegates everything else through two swappable interfaces — `LLMInterface` (models, via the [`@prismshadow/mmsp`](https://www.npmjs.com/package/@prismshadow/mmsp) gateway) and `EnvironmentInterface` (tool execution). The SDK caller is the Human boundary: one entry point, `session.run`, streams the whole loop.

```ts
import { createAgent, isCompleteModelMessage, userText } from "@niceagent/core";

const agent = await createAgent({ agentId: "default_agent" });
const session = await agent.createSession({ workspaceDir: process.cwd() });

for await (const output of session.run([userText("Create hello.txt containing hi")], {
  approve: async () => "allow", // per-tool-call approval
})) {
  if (isCompleteModelMessage(output) && output.payload.type === "text") {
    console.log(output.payload.text);
  }
}
```

A single `run` drives a complete Task: streaming output, per-call approvals, concurrent tool execution, interrupt carry-over, automatic reconnect and context compaction. State lives under `~/.niceagent/data` (`NICEAGENT_HOME`); every Session restores fully from its Trace.

## Documentation

- [Architecture](https://github.com/gqallen931/niceagent/blob/main/docs/ARCHITECTURE.md)
- [AMSP Records](https://github.com/gqallen931/niceagent/tree/main/docs/amsp-records)
- [Core Interfaces](https://github.com/gqallen931/niceagent/tree/main/docs/interfaces)
- [The Agent Loop](https://github.com/gqallen931/niceagent/tree/main/docs/agent-loop)
- [Sessions & Traces](https://github.com/gqallen931/niceagent/tree/main/docs/sessions-and-traces)

## Development

```bash
pnpm --filter @niceagent/core build       # tsup → dist/ (exports point at dist)
pnpm --filter @niceagent/core typecheck
pnpm --filter @niceagent/core test
pnpm test:e2e                                       # live-model e2e (needs DEEPSEEK_API_KEY)
```

Part of [NiceAgent](https://github.com/gqallen931/niceagent) · Apache-2.0

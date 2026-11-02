#!/usr/bin/env node
/** `niceagent-hmr` (alias `niceagent-hmr`) as `pnpm link:cli` puts it on PATH; see launch.mjs. */
import { launch } from "./launch.mjs";

await launch("niceagent-hmr.js");

#!/usr/bin/env node
/** `niceagent` (alias `niceagent`) as `pnpm link:cli` puts it on PATH; see launch.mjs. */
import { launch } from "./launch.mjs";

await launch("niceagent.js");

/**
 * resolveServerConfig: how the server reads its environment.
 *
 * - An empty PORT (the common `PORT=` line in `.env`) reads as unset, never as port 0; an
 *   explicit value takes effect and an explicit "0" is kept (bind a random free port); a
 *   non-integer or out-of-range value throws. This matches the CLI's resolvePort.
 * - NICEAGENT_SEED_ADMIN_PASSWORD: unset, empty or blank leaves the seed unpinned (null, so the
 *   seed generates its own); a value is kept trimmed; desktop mode changes neither.
 * - NICEAGENT_CLI_ENTRY: a value is kept trimmed; a blank one falls through to the checkout
 *   lookup like an unset one.
 * - MODELSCOPE_BRIDGE_URL may carry a path prefix but refuses plaintext HTTP, credentials, a
 *   query and a fragment; unset reads as undefined, which makes ModelScope authorization
 *   unavailable.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import { resolveServerConfig } from "../src/config.js";

const base = { NICEAGENT_HOME: "/tmp/niceagent-config-test" };

describe("resolveServerConfig: PORT parsing", () => {
  it("reads an empty PORT as unset, not as port 0", () => {
    const unset = resolveServerConfig({ ...base }).port;
    expect(unset).not.toBe(0);
    expect(resolveServerConfig({ ...base, PORT: "" }).port).toBe(unset);
  });

  it('takes an explicit value, and keeps "0" (binds a random available port)', () => {
    expect(resolveServerConfig({ ...base, PORT: "8930" }).port).toBe(8930);
    expect(resolveServerConfig({ ...base, PORT: "0" }).port).toBe(0);
  });

  it("throws on a non-integer or out-of-range value", () => {
    for (const bad of ["abc", "3.14", "-1", "65536"]) {
      expect(() => resolveServerConfig({ ...base, PORT: bad }), bad).toThrow(/Invalid port/);
    }
  });
});

describe("resolveServerConfig: seed password", () => {
  it("leaves the seed unpinned when unset, empty or blank, and keeps a value trimmed", () => {
    expect(resolveServerConfig({ ...base }).seedAdminPassword).toBeNull();
    for (const blank of ["", "  "]) {
      expect(
        resolveServerConfig({ ...base, NICEAGENT_SEED_ADMIN_PASSWORD: blank }).seedAdminPassword,
      ).toBeNull();
    }
    expect(
      resolveServerConfig({ ...base, NICEAGENT_SEED_ADMIN_PASSWORD: " niceagent-9999 " })
        .seedAdminPassword,
    ).toBe("niceagent-9999");
  });

  it("desktop mode leaves the seed unpinned, and an explicit value still wins there", () => {
    // Nothing pins it: the password the seed generates on its own is already unguessable, so
    // supplying one here would just be a second way to say the same thing.
    const desktop = { ...base, NICEAGENT_DESKTOP_TOKEN: "tok" };
    expect(resolveServerConfig(desktop).seedAdminPassword).toBeNull();
    expect(
      resolveServerConfig({ ...desktop, NICEAGENT_SEED_ADMIN_PASSWORD: "niceagent-2026" })
        .seedAdminPassword,
    ).toBe("niceagent-2026");
  });
});

describe("resolveServerConfig: NICEAGENT_CLI_ENTRY parsing", () => {
  it("keeps a value trimmed — it is what the <root>/bin/niceagent shim execs", () => {
    const config = resolveServerConfig({
      ...base,
      NICEAGENT_CLI_ENTRY: " /opt/niceagent/dist/niceagent.js ",
    });
    expect(config.cliEntry).toBe("/opt/niceagent/dist/niceagent.js");
    expect(config.cliLaunch).toMatchObject({ execArgs: [], origin: "env", unavailable: null });
  });

  it("falls through to the checkout lookup on a blank value, like unset", () => {
    // This test runs from the checkout's source, as `pnpm dev` runs the server, so the lookup
    // offers the checkout's CLI source (see cli-shim.test.ts for resolveCliLaunch itself); the
    // claim here is only that a blank value is not treated as an entry.
    const blank = resolveServerConfig({ ...base, NICEAGENT_CLI_ENTRY: "   " });
    const unset = resolveServerConfig({ ...base });
    expect(blank.cliEntry).toBe(unset.cliEntry);
    expect(blank.cliLaunch).toEqual(unset.cliLaunch);
    expect(blank.cliEntry?.endsWith(path.join("packages", "cli", "src", "niceagent.ts"))).toBe(true);
  });
});

describe("resolveServerConfig: MODELSCOPE_BRIDGE_URL parsing", () => {
  it("is undefined when unset, which makes the authorization flow unavailable", () => {
    expect(resolveServerConfig(base).modelscopeBridgeUrl).toBeUndefined();
    expect(
      resolveServerConfig({ ...base, MODELSCOPE_BRIDGE_URL: "   " }).modelscopeBridgeUrl,
    ).toBeUndefined();
  });

  it("allows a path prefix, trimmed of its surrounding space and trailing slash", () => {
    expect(
      resolveServerConfig({
        ...base,
        MODELSCOPE_BRIDGE_URL: " https://bridge.example.com/modelscope/ ",
      }).modelscopeBridgeUrl,
    ).toBe("https://bridge.example.com/modelscope");
  });

  it("refuses plaintext HTTP, credentials, a query and a fragment", () => {
    for (const bad of [
      "http://bridge.example.com/modelscope",
      "https://user:pass@bridge.example.com/modelscope",
      "https://bridge.example.com/modelscope?next=x",
      "https://bridge.example.com/modelscope#token",
    ]) {
      expect(() => resolveServerConfig({ ...base, MODELSCOPE_BRIDGE_URL: bad }), bad).toThrow(
        /Invalid MODELSCOPE_BRIDGE_URL/,
      );
    }
  });
});

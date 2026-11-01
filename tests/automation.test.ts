import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { PersonalStore, digest } from "../server/personal-store";
import { createApp } from "../server";
import { emptyData } from "../src/utils/validation";

test("desktop grants are hashed, expire, single-use, and revoked by password reset", async () => {
  const store = new PersonalStore(":memory:");
  try {
    assert.throws(() => store.createDesktopGrant());
    await store.setPassword("test-only-owner-password");
    const old = store.createDesktopGrant(1000),
      latest = store.createDesktopGrant(1001);
    assert.equal(store.redeemDesktopGrant(old, 1002), null);
    assert.equal(
      (
        store.db.prepare("SELECT token FROM desktop_grants").get() as {
          token: string;
        }
      ).token,
      digest(latest),
    );
    const session = store.redeemDesktopGrant(latest, 1002)!;
    assert.ok(store.session(session, 1003));
    assert.equal(store.redeemDesktopGrant(latest, 1003), null);
    const expired = store.createDesktopGrant(2000);
    assert.equal(store.redeemDesktopGrant(expired, 62000), null);
    const reset = store.createDesktopGrant();
    await store.setPassword("test-only-owner-password", true);
    assert.equal(store.redeemDesktopGrant(reset), null);
  } finally {
    store.close();
  }
});

test("desktop preparation is repeatable and preserves an existing owner and saved data", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "life-os-auto-"));
  const filename = path.join(dir, "owner.sqlite");
  const run = (action: string) =>
    execFileSync(
      process.execPath,
      ["--import", "tsx", "scripts/desktop.ts", action],
      {
        env: { ...process.env, LIFE_OS_DB_PATH: filename },
        stdio: ["ignore", "pipe", "pipe"],
      },
    ).toString();
  try {
    assert.equal(run("prepare"), "configured");
    let store = new PersonalStore(filename);
    assert.ok(store.configured());
    store.close();
    store = new PersonalStore(filename);
    await store.setPassword("test-only-existing-owner", true);
    store.write(emptyData(), 0);
    store.close();
    run("prepare");
    run("prepare");
    store = new PersonalStore(filename);
    try {
      assert.equal(await store.checkPassword("test-only-existing-owner"), true);
      assert.equal(store.read().revision, 1);
    } finally {
      store.close();
    }
    const grant = JSON.parse(run("grant"));
    store = new PersonalStore(filename);
    try {
      assert.ok(store.redeemDesktopGrant(grant.token));
    } finally {
      store.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("desktop redemption requires loopback mode, exact origin and a one-time credential", async () => {
  for (const enabled of [false, true]) {
    const store = new PersonalStore(":memory:");
    await store.setPassword("test-only-desktop-password");
    const origin = "http://127.0.0.1:3103";
    const app = createApp({
      client: null,
      personal: { store, origin, desktop: enabled },
    });
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((r) => server.once("listening", r));
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const grant = store.createDesktopGrant();
    const headers = {
      "Content-Type": "application/json",
      Origin: origin,
      "X-Requested-With": "life-os",
    };
    const redeem = (originValue: string) =>
      fetch(base + "/api/auth/desktop", {
        method: "POST",
        headers: { ...headers, Origin: originValue },
        body: JSON.stringify({ token: grant }),
      });
    try {
      assert.equal((await redeem("https://attacker.invalid")).status, 403);
      const response = await redeem(origin);
      assert.equal(response.status, enabled ? 200 : 404);
      if (enabled) {
        assert.match(response.headers.get("set-cookie")!, /HttpOnly/);
        assert.equal((await redeem(origin)).status, 401);
      }
      assert.equal((await fetch(base + "/api/data")).status, 401);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
      store.close();
    }
  }
  const s = new PersonalStore(":memory:");
  try {
    assert.throws(() =>
      createApp({
        personal: { store: s, origin: "https://example.com", desktop: true },
      }),
    );
  } finally {
    s.close();
  }
});

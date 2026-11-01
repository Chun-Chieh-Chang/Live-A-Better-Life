import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  PersonalStore,
  ConflictError,
  QuotaError,
} from "../server/personal-store";
import { createApp } from "../server";
import { emptyData } from "../src/utils/validation";
import { INITIAL_ENTRIES } from "./fixtures/lifeData";

// Public, fixed credentials for disposable test databases only. Never configure a real instance with these.
const password = "test-only-password-123456";
const data = () => ({
  ...emptyData(),
  entries: [structuredClone(INITIAL_ENTRIES[0])],
});
async function instance(
  run: (
    base: string,
    store: PersonalStore,
    headers: Record<string, string>,
  ) => Promise<void>,
  client: any = null,
  limits = {},
) {
  const store = new PersonalStore(":memory:");
  await store.setPassword(password);
  // Reserve a local port before constructing the exact-origin configuration.
  const { createServer } = await import("node:net");
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await new Promise<void>((r) => probe.once("listening", r));
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>((r) => probe.close(() => r()));
  const base = `http://127.0.0.1:${port}`;
  const server = createApp({
    client,
    personal: { store, origin: base, ...limits },
    timeoutMs: 1000,
  }).listen(port, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const headers = {
    "Content-Type": "application/json",
    Origin: base,
    "X-Requested-With": "life-os",
  };
  try {
    await run(base, store, headers);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    store.close();
  }
}
async function login(base: string, headers: Record<string, string>) {
  const r = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers,
    body: JSON.stringify({ password }),
  });
  assert.equal(r.status, 200);
  const cookie = r.headers.get("set-cookie")!;
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Strict/i);
  return { ...headers, Cookie: cookie.split(";")[0] };
}

test("owner credentials are hashed, sessions expire and password rotation revokes access", async () => {
  const s = new PersonalStore(":memory:");
  try {
    await s.setPassword(password);
    assert.equal(await s.checkPassword("wrong"), false);
    assert.equal(await s.checkPassword(password), true);
    assert.ok(
      !JSON.stringify(s.db.prepare("SELECT * FROM owner").all()).includes(
        password,
      ),
    );
    const token = s.newSession(1000);
    assert.equal(s.session(token, 1001), true);
    assert.equal(s.session(token, 1000 + 8 * 3600000), false);
    await assert.rejects(s.setPassword("too-short"));
    await assert.rejects(s.setPassword(password));
    const live = s.newSession();
    await s.setPassword(password, true);
    assert.equal(s.session(live), false);
  } finally {
    s.close();
  }
});

test("unauthenticated and cross-site callers cannot access private data or consume AI", async () => {
  let calls = 0;
  await instance(
    async (base, _store, headers) => {
      for (const url of ["/api/data", "/api/backups", "/api/system/status"])
        assert.equal((await fetch(base + url)).status, 401);
      assert.equal(
        (
          await fetch(base + "/api/coach", {
            method: "POST",
            headers,
            body: JSON.stringify({ state: "good", data: {} }),
          })
        ).status,
        401,
      );
      assert.equal(calls, 0);
      const bad = await fetch(base + "/api/auth/login", {
        method: "POST",
        headers: { ...headers, Origin: "https://attacker.invalid" },
        body: JSON.stringify({ password }),
      });
      assert.equal(bad.status, 403);
      const logged = await login(base, headers);
      assert.equal(
        (
          await fetch(base + "/api/data", {
            method: "PUT",
            headers: { ...logged, "X-Requested-With": "" },
            body: JSON.stringify({ data: data(), expectedRevision: 0 }),
          })
        ).status,
        403,
      );
      assert.equal(
        (await fetch(base + "/api/data", { headers: logged })).headers.get(
          "cache-control",
        ),
        "no-store",
      );
      await fetch(base + "/api/auth/logout", {
        method: "POST",
        headers: logged,
      });
      assert.equal(
        (await fetch(base + "/api/data", { headers: logged })).status,
        401,
      );
    },
    {
      models: {
        generateContent: async () => {
          calls++;
          return { text: "hello" };
        },
      },
    },
  );
});

test("login attempts are limited before expensive password verification", async () => {
  await instance(async (base, _s, headers) => {
    for (let i = 0; i < 5; i++)
      assert.equal(
        (
          await fetch(base + "/api/auth/login", {
            method: "POST",
            headers,
            body: JSON.stringify({ password: "wrong" }),
          })
        ).status,
        401,
      );
    assert.equal(
      (
        await fetch(base + "/api/auth/login", {
          method: "POST",
          headers,
          body: JSON.stringify({ password }),
        })
      ).status,
      429,
    );
  });
});

test("two devices use revision checks and history restore creates a new version", async () => {
  await instance(async (base, _s, headers) => {
    const one = await login(base, headers),
      two = await login(base, headers);
    assert.equal(
      (await fetch(base + "/api/data", { headers: two })).status,
      200,
    );
    const first = await fetch(base + "/api/data", {
      method: "PUT",
      headers: one,
      body: JSON.stringify({ data: data(), expectedRevision: 0 }),
    });
    assert.equal(first.status, 200);
    assert.equal((await first.json()).revision, 1);
    const stale = await fetch(base + "/api/data", {
      method: "PUT",
      headers: two,
      body: JSON.stringify({ data: emptyData(), expectedRevision: 0 }),
    });
    assert.equal(stale.status, 409);
    assert.deepEqual(
      (await (await fetch(base + "/api/data", { headers: two })).json()).data,
      data(),
    );
    const second = await fetch(base + "/api/data", {
      method: "PUT",
      headers: two,
      body: JSON.stringify({ data: emptyData(), expectedRevision: 1 }),
    });
    assert.equal(second.status, 200);
    const restored = await fetch(base + "/api/data/restore", {
      method: "POST",
      headers: one,
      body: JSON.stringify({ backupRevision: 1, expectedRevision: 2 }),
    });
    const j = await restored.json();
    assert.equal(j.revision, 3);
    assert.deepEqual(j.data, data());
    assert.equal(
      (
        await fetch(base + "/api/data/restore", {
          method: "POST",
          headers: two,
          body: JSON.stringify({ backupRevision: 0, expectedRevision: 2 }),
        })
      ).status,
      409,
    );
  });
});

test("hourly/day AI budgets persist and prevent SDK calls beyond quota", async () => {
  let calls = 0;
  await instance(
    async (base, _s, headers) => {
      const auth = await login(base, headers);
      for (let i = 0; i < 2; i++)
        assert.equal(
          (
            await fetch(base + "/api/coach", {
              method: "POST",
              headers: auth,
              body: JSON.stringify({ state: "good", data: {} }),
            })
          ).status,
          200,
        );
      assert.equal(
        (
          await fetch(base + "/api/system/test-ai", {
            method: "POST",
            headers: auth,
          })
        ).status,
        429,
      );
      assert.equal(calls, 2);
    },
    {
      models: {
        generateContent: async () => {
          calls++;
          return {
            text: JSON.stringify({
              strategies: ["If ready, Then act"],
              psychologicalInsight: "test",
            }),
          };
        },
      },
    },
    { aiHourly: 2, aiDaily: 2 },
  );
  const s = new PersonalStore(":memory:");
  try {
    s.consume([{ key: "hour", max: 1, windowMs: 10 }], 0);
    assert.throws(
      () => s.consume([{ key: "hour", max: 1, windowMs: 10 }], 1),
      QuotaError,
    );
    s.consume([{ key: "hour", max: 1, windowMs: 10 }], 10);
  } finally {
    s.close();
  }
});

test("file database survives reopen, bounded backups and failure roll back atomically", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "life-os-store-"));
  const file = path.join(dir, "private.sqlite");
  let s: PersonalStore | undefined;
  try {
    s = new PersonalStore(file);
    await s.setPassword(password);
    s.write(data(), 0);
    const token = s.newSession();
    s.close();
    s = new PersonalStore(file);
    assert.equal(s.session(token), true);
    assert.deepEqual(s.read().data, data());
    const before = s.read();
    s.db.exec(
      "CREATE TRIGGER fail_backup BEFORE INSERT ON backups BEGIN SELECT RAISE(ABORT,'disk failure'); END;",
    );
    assert.throws(() => s!.write(emptyData(), 1));
    assert.deepEqual(s.read(), before);
    s.db.exec("DROP TRIGGER fail_backup");
    for (let i = 1; i <= 35; i++) s.write(data(), i);
    assert.equal(s.backups().length, 30);
    s.close();
    s = undefined;
    if (process.platform !== "win32")
      assert.equal(statSync(file).mode & 0o777, 0o600);
  } finally {
    s?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("offline backup restores to a new database without overwriting the source", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "life-os-drill-"));
  const source = path.join(dir, "source.sqlite"),
    target = path.join(dir, "restored.sqlite"),
    backup = path.join(dir, "backup.json");
  try {
    let s = new PersonalStore(source);
    s.write(data(), 0);
    s.close();
    const run = (args: string[], db: string) =>
      execFileSync(
        process.execPath,
        ["--import", "tsx", "scripts/backup.ts", ...args],
        {
          cwd: process.cwd(),
          env: { ...process.env, LIFE_OS_DB_PATH: db },
          stdio: "pipe",
        },
      );
    run(["export", backup], source);
    if (process.platform !== "win32")
      assert.equal(statSync(backup).mode & 0o777, 0o600);
    assert.deepEqual(
      JSON.parse(readFileSync(backup, "utf8")).entries,
      data().entries,
    );
    run(["restore", backup], target);
    s = new PersonalStore(target);
    assert.deepEqual(s.read().data, data());
    assert.equal(s.configured(), false);
    s.close();
    assert.throws(() => run(["restore", backup], source));
    assert.throws(() => run(["export", backup], source));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("concurrent AI calls are rejected before reaching the model", async () => {
  let calls = 0,
    release: () => void = () => {};
  const waiting = new Promise<void>((r) => {
    release = r;
  });
  await instance(
    async (base, _s, headers) => {
      const auth = await login(base, headers);
      const first = fetch(base + "/api/coach", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ state: "good", data: {} }),
      });
      try {
        for (let i = 0; i < 100 && calls === 0; i++)
          await new Promise((r) => setTimeout(r, 5));
        assert.equal(calls, 1);
        assert.equal(
          (
            await fetch(base + "/api/system/test-ai", {
              method: "POST",
              headers: auth,
            })
          ).status,
          429,
        );
        assert.equal(calls, 1);
      } finally {
        release();
      }
      assert.equal((await first).status, 200);
    },
    {
      models: {
        generateContent: async () => {
          calls++;
          await waiting;
          return {
            text: JSON.stringify({
              strategies: ["If ready, Then act"],
              psychologicalInsight: "test",
            }),
          };
        },
      },
    },
  );
});

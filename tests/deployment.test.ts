import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  utimesSync,
  symlinkSync,
  rmSync,
  statSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { PersonalStore } from "../server/personal-store";
import { scheduledBackup } from "../scripts/scheduled-backup";
import { createApp } from "../server";
import { emptyData, parseBackup } from "../src/utils/validation";

test("scheduled backup exports validated data and prunes only expired owned regular files", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "life-os-schedule-"));
  const db = path.join(root, "owner.sqlite"),
    dir = path.join(root, "backups");
  mkdirSync(dir);
  const now = new Date();
  const old = new Date(now.getTime() - 40 * 86400000);
  const own =
    "life-os-2025-01-01T00-00-00.000Z-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.json";
  const link =
    "life-os-2025-01-02T00-00-00.000Z-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.json";
  try {
    const store = new PersonalStore(db);
    store.write(emptyData(), 0);
    store.close();
    writeFileSync(path.join(dir, own), "old");
    utimesSync(path.join(dir, own), old, old);
    writeFileSync(path.join(dir, "user-backup.json"), "keep");
    utimesSync(path.join(dir, "user-backup.json"), old, old);
    if (process.platform !== "win32")
      symlinkSync(path.join(dir, "user-backup.json"), path.join(dir, link));
    const result = scheduledBackup(db, dir, now);
    assert.deepEqual(parseBackup(readFileSync(result, "utf8")), emptyData());
    if (process.platform !== "win32")
      assert.equal(statSync(result).mode & 0o777, 0o600);
    assert.equal(existsSync(path.join(dir, own)), false);
    assert.equal(existsSync(path.join(dir, "user-backup.json")), true);
    if (process.platform !== "win32")
      assert.equal(existsSync(path.join(dir, link)), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("failed scheduled backup does not delete prior recovery files", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "life-os-failed-export-"));
  const db = path.join(root, "damaged.sqlite"),
    dir = path.join(root, "backups");
  mkdirSync(dir);
  const name =
    "life-os-2025-01-01T00-00-00.000Z-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.json";
  try {
    writeFileSync(db, "not a database");
    writeFileSync(path.join(dir, name), "keep");
    assert.throws(() => scheduledBackup(db, dir));
    assert.equal(readFileSync(path.join(dir, name), "utf8"), "keep");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("readiness requires owner setup and a usable personal database", async () => {
  const store = new PersonalStore(":memory:");
  const app = createApp({
    client: null,
    personal: { store, origin: "http://127.0.0.1:4321" },
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  let closed = false;
  try {
    assert.equal((await fetch(base + "/healthz")).status, 200);
    assert.equal((await fetch(base + "/readyz")).status, 503);
    await store.setPassword("test-only-readiness-password");
    assert.equal((await fetch(base + "/readyz")).status, 200);
    store.close();
    closed = true;
    assert.equal((await fetch(base + "/readyz")).status, 503);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    if (!closed) store.close();
  }
});

test("password provisioning preserves UTF-8 input across pipe chunks", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "life-os-password-pipe-"));
  const filename = path.join(dir, "owner.sqlite");
  const password = "測試專用中文密碼-1234567890";
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "scripts/account.ts"],
    {
      env: { ...process.env, LIFE_OS_DB_PATH: filename },
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  child.stdout.resume();
  child.stderr.resume();
  const done = new Promise<number | null>((resolve, reject) => {
    child.once("exit", resolve);
    child.once("error", reject);
  });
  try {
    const bytes = Buffer.from(password, "utf8");
    child.stdin.write(bytes.subarray(0, 1));
    await new Promise((r) => setTimeout(r, 200));
    child.stdin.end(bytes.subarray(1));
    assert.equal(await done, 0);
    const store = new PersonalStore(filename);
    try {
      assert.equal(await store.checkPassword(password), true);
    } finally {
      store.close();
    }
  } finally {
    if (child.exitCode === null) child.kill();
    rmSync(dir, { recursive: true, force: true });
  }
});

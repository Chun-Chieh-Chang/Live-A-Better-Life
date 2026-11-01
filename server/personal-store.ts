import { DatabaseSync } from "node:sqlite";
import {
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { mkdirSync, chmodSync } from "node:fs";
import path from "node:path";
import {
  emptyData,
  isLifeData,
  type LifeData,
} from "../src/utils/validation.ts";

const scrypt = promisify(scryptCallback);
export const digest = (text: string) =>
  createHash("sha256").update(text).digest("hex");
export class ConflictError extends Error {}
export class QuotaError extends Error {}
export class PersonalStore {
  readonly db: DatabaseSync;
  readonly workspaceId: string;
  constructor(filename: string) {
    if (filename !== ":memory:") {
      if (!path.isAbsolute(filename))
        throw new Error("LIFE_OS_DB_PATH must be absolute");
      mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
    }
    this.db = new DatabaseSync(filename);
    try {
      if (filename !== ":memory:") chmodSync(filename, 0o600);
      this.db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS owner (id INTEGER PRIMARY KEY CHECK(id=1), salt TEXT NOT NULL, hash TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS desktop_grants (token TEXT PRIMARY KEY, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS document (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS backups (revision INTEGER PRIMARY KEY, data TEXT NOT NULL, created TEXT NOT NULL);
    `);
      this.db
        .prepare("INSERT OR IGNORE INTO meta VALUES (?,?)")
        .run("workspaceId", randomUUID());
      this.workspaceId = (
        this.db
          .prepare("SELECT value FROM meta WHERE key=?")
          .get("workspaceId") as { value: string }
      ).value;
      this.db
        .prepare("INSERT OR IGNORE INTO document VALUES (1,0,?)")
        .run(JSON.stringify(emptyData()));
      // Validate persisted data on opening; never reset a damaged database automatically.
      this.read();
    } catch (error) {
      // A failed constructor has no caller-owned store to close.
      try {
        this.db.close();
      } catch {
        /* Keep the initialization error. */
      }
      throw error;
    }
  }
  configured() {
    return !!this.db.prepare("SELECT id FROM owner WHERE id=1").get();
  }
  async setPassword(password: string, replace = false) {
    if (password.length < 14 || password.length > 256)
      throw new Error("Password must contain 14–256 characters");
    if (this.configured() && !replace)
      throw new Error("Owner already configured; explicit reset required");
    const salt = randomBytes(32).toString("hex");
    const hash = ((await scrypt(password, salt, 64)) as Buffer).toString("hex");
    this.transaction(() => {
      this.db
        .prepare("INSERT OR REPLACE INTO owner VALUES (1,?,?)")
        .run(salt, hash);
      this.db.exec("DELETE FROM sessions; DELETE FROM desktop_grants");
    });
  }
  async checkPassword(password: string) {
    if (typeof password !== "string" || password.length > 256) return false;
    const row = this.db
      .prepare("SELECT salt,hash FROM owner WHERE id=1")
      .get() as { salt: string; hash: string } | undefined;
    if (!row) return false;
    const computed = (await scrypt(password, row.salt, 64)) as Buffer;
    return timingSafeEqual(computed, Buffer.from(row.hash, "hex"));
  }
  newSession(now = Date.now()) {
    const token = randomBytes(32).toString("hex");
    this.db.prepare("DELETE FROM sessions WHERE expires <= ?").run(now);
    this.db
      .prepare("INSERT INTO sessions VALUES (?,?)")
      .run(digest(token), now + 8 * 60 * 60 * 1000);
    return token;
  }
  session(token: string, now = Date.now()) {
    if (!/^[a-f0-9]{64}$/.test(token)) return false;
    return !!this.db
      .prepare("SELECT token FROM sessions WHERE token=? AND expires>?")
      .get(digest(token), now);
  }
  logout(token: string) {
    this.db.prepare("DELETE FROM sessions WHERE token=?").run(digest(token));
  }
  createDesktopGrant(now = Date.now()) {
    if (!this.configured()) throw new Error("Owner not configured");
    const grant = randomBytes(32).toString("hex");
    this.transaction(() => {
      // Only the newest locally issued handoff remains usable.
      this.db.exec("DELETE FROM desktop_grants");
      this.db
        .prepare("INSERT INTO desktop_grants VALUES (?,?)")
        .run(digest(grant), now + 60000);
    });
    return grant;
  }
  redeemDesktopGrant(grant: string, now = Date.now()) {
    if (typeof grant !== "string" || !/^[a-f0-9]{64}$/.test(grant)) return null;
    return this.transaction(() => {
      const result = this.db
        .prepare("DELETE FROM desktop_grants WHERE token=? AND expires>?")
        .run(digest(grant), now);
      return Number(result.changes) === 1 ? this.newSession(now) : null;
    });
  }
  consume(
    limits: { key: string; max: number; windowMs: number }[],
    now = Date.now(),
  ) {
    this.transaction(() => {
      this.db.prepare("DELETE FROM limits WHERE expires <= ?").run(now);
      for (const limit of limits) {
        const row = this.db
          .prepare("SELECT count FROM limits WHERE key=?")
          .get(limit.key) as { count: number } | undefined;
        if (row && row.count >= limit.max)
          throw new QuotaError("Usage limit reached");
      }
      for (const limit of limits)
        this.db
          .prepare(
            "INSERT INTO limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1",
          )
          .run(limit.key, now + limit.windowMs);
    });
  }
  read() {
    const row = this.db
      .prepare("SELECT revision,data FROM document WHERE id=1")
      .get() as { revision: number; data: string };
    const data = JSON.parse(row.data);
    if (!isLifeData(data))
      throw new Error(
        "Invalid saved server data; restore from an offline backup",
      );
    return { revision: row.revision, data: data as LifeData };
  }
  write(data: LifeData, expectedRevision: number) {
    if (
      !isLifeData(data) ||
      !Number.isSafeInteger(expectedRevision) ||
      expectedRevision < 0
    )
      throw new Error("Invalid document");
    return this.transaction(() => {
      const current = this.read();
      if (current.revision !== expectedRevision)
        throw new ConflictError("Data changed on another device");
      this.db
        .prepare("INSERT INTO backups VALUES (?,?,?)")
        .run(
          current.revision,
          JSON.stringify(current.data),
          new Date().toISOString(),
        );
      this.db
        .prepare("UPDATE document SET revision=?, data=? WHERE id=1")
        .run(current.revision + 1, JSON.stringify(data));
      this.db.exec(
        "DELETE FROM backups WHERE revision NOT IN (SELECT revision FROM backups ORDER BY revision DESC LIMIT 30)",
      );
      return this.read();
    });
  }
  backups() {
    return this.db
      .prepare("SELECT revision,created FROM backups ORDER BY revision DESC")
      .all();
  }
  backup(revision: number) {
    const row = this.db
      .prepare("SELECT data FROM backups WHERE revision=?")
      .get(revision) as { data: string } | undefined;
    if (!row) return null;
    const data = JSON.parse(row.data);
    if (!isLifeData(data)) throw new Error("Invalid backup data");
    return data as LifeData;
  }
  private transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  close() {
    this.db.close();
  }
}

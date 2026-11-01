import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { ObsidianMirror } from "../server/obsidian.ts";
import { emptyData } from "../src/utils/validation.ts";
const fixture = () => {
  const data = emptyData();
  data.entries = [
    {
      id: "entry-1",
      date: "2026-11-01",
      state: "good" as const,
      tags: [],
      factors: [],
      goodWhere: "hello",
      createdAt: "2026-11-01T00:00:00Z",
      updatedAt: "2026-11-01T00:00:00Z",
    },
  ];
  return data;
};
test("saved data automatically becomes identifiable notes and manual", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "life-os-vault-"));
  try {
    const mirror = new ObsidianMirror(dir);
    mirror.sync(fixture(), 1);
    const note = readFileSync(path.join(dir, "01_日記/2026-11-01.md"), "utf8");
    assert.match(note, /hello/);
    assert.match(note, /entry-1/);
    assert.ok(existsSync(path.join(dir, "我的小改變.md")));
    mirror.sync(fixture(), 2);
    assert.match(
      readFileSync(path.join(dir, "01_日記/2026-11-01.md"), "utf8"),
      /life_os_revision: 2/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("notes edited externally are preserved before regeneration; unrelated notes stay intact", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "life-os-vault-"));
  try {
    const mirror = new ObsidianMirror(dir);
    mirror.sync(fixture(), 1);
    writeFileSync(path.join(dir, "01_日記/2026-11-01.md"), "user edit");
    writeFileSync(path.join(dir, "personal.md"), "leave alone");
    mirror.sync(fixture(), 2);
    assert.ok(
      readdirSync(path.join(dir, "保留的修改")).some(
        (n) =>
          readFileSync(path.join(dir, "保留的修改", n), "utf8") === "user edit",
      ),
    );
    assert.equal(
      readFileSync(path.join(dir, "personal.md"), "utf8"),
      "leave alone",
    );
    mirror.sync(emptyData(), 3);
    assert.equal(existsSync(path.join(dir, "01_日記/2026-11-01.md")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("unsafe dates and linked note targets cannot write outside the vault", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "life-os-vault-"));
  try {
    const data = fixture();
    data.entries[0].date = "../outside";
    assert.throws(() => new ObsidianMirror(dir).sync(data, 1));
    assert.equal(existsSync(path.join(dir, "../outside.md")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("backend save exports notes; failure reports pending without rolling back saved records; retry recovers", async () => {
  const { createApp } = await import("../server.ts");
  const { PersonalStore } = await import("../server/personal-store.ts");
  const root = mkdtempSync(path.join(os.tmpdir(), "life-os-vault-api-"));
  const vault = path.join(root, "notes");
  const store = new PersonalStore(":memory:");
  const app = createApp({
    client: null,
    personal: {
      store,
      origin: "http://127.0.0.1:8765",
      obsidian: new ObsidianMirror(vault),
      chooseNotesFolder: async () => ({
        path: path.join(root, "chosen"),
        parent: root,
        folders: [],
        roots: [path.parse(root).root],
      }),
      changeNotesFolder: async (target) => new ObsidianMirror(target),
    },
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const base = "http://127.0.0.1:" + (server.address() as any).port;
  const cookie = "life_os_session=" + store.newSession();
  const headers = {
    "Content-Type": "application/json",
    Origin: "http://127.0.0.1:8765",
    "X-Requested-With": "life-os",
    Cookie: cookie,
  };
  try {
    assert.equal((await fetch(base + "/api/obsidian")).status, 401);
    let response = await fetch(base + "/api/data", {
      method: "PUT",
      headers,
      body: JSON.stringify({ expectedRevision: 0, data: fixture() }),
    });
    let saved = await response.json();
    assert.equal(saved.obsidian.status, "saved");
    assert.match(
      readFileSync(path.join(vault, "01_日記/2026-11-01.md"), "utf8"),
      /hello/,
    );
    const { renameSync, unlinkSync } = await import("node:fs");
    renameSync(vault, vault + ".old");
    writeFileSync(vault, "blocked");
    const changed = fixture();
    changed.entries[0].goodWhere = "second";
    response = await fetch(base + "/api/data", {
      method: "PUT",
      headers,
      body: JSON.stringify({ expectedRevision: 1, data: changed }),
    });
    saved = await response.json();
    assert.equal(saved.obsidian.status, "pending");
    assert.equal(store.read().data.entries[0].goodWhere, "second");
    unlinkSync(vault);
    renameSync(vault + ".old", vault);
    response = await fetch(base + "/api/obsidian/retry", {
      method: "POST",
      headers,
    });
    assert.equal((await response.json()).status, "saved");
    assert.match(
      readFileSync(path.join(vault, "01_日記/2026-11-01.md"), "utf8"),
      /second/,
    );
    response = await fetch(base + "/api/obsidian/choose-folder", {
      method: "POST",
      headers,
    });
    assert.equal((await response.json()).path, path.join(root, "chosen"));
    response = await fetch(base + "/api/obsidian/location", {
      method: "PUT",
      headers,
      body: JSON.stringify({ path: path.join(root, "chosen") }),
    });
    const moved = await response.json();
    assert.equal(moved.directory, path.join(root, "chosen"));
    assert.equal(moved.status, "saved");
    assert.ok(existsSync(path.join(vault, "01_日記/2026-11-01.md")));
    assert.match(
      readFileSync(path.join(root, "chosen/01_日記/2026-11-01.md"), "utf8"),
      /second/,
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test('external note copies preserve original bytes including non-UTF8 encoding',()=>{const root=mkdtempSync(path.join(os.tmpdir(),'life-os-vault-bytes-'));try{const mirror=new ObsidianMirror(root);mirror.sync(fixture(),1);const original=Buffer.from([255,254,65,0,66,0]);writeFileSync(path.join(root,'01_日記/2026-11-01.md'),original);mirror.sync(fixture(),2);assert.ok(readdirSync(path.join(root,'保留的修改')).some(file=>readFileSync(path.join(root,'保留的修改',file)).equals(original)));}finally{rmSync(root,{recursive:true,force:true});}});

const note = (dir: string) => path.join(dir, "01_日記/2026-11-01.md");
const edit = (dir: string, from: string, to: string) =>
  writeFileSync(note(dir), readFileSync(note(dir), "utf8").replace(from, to));
test("every state round-trips its fields and a line-ending-only change is not an edit", () => {
  for (const state of ["good", "bad", "normal"] as const) {
    const dir = mkdtempSync(path.join(os.tmpdir(), "life-os-vault-"));
    try {
      const data = fixture();
      Object.assign(data.entries[0], { state, goodWhere: "a", badFact: "b", badEmotion: "c", badReason: "d", normalMoment: "e", goodKeep: "line1\nline2" });
      const mirror = new ObsidianMirror(dir);
      mirror.sync(data, 1);
      assert.deepEqual(mirror.changes(data), []);
      writeFileSync(note(dir), readFileSync(note(dir), "utf8").replace(/\n/g, "\r\n"));
      assert.deepEqual(mirror.changes(data), []);
      mirror.sync(data, 2);
      assert.equal(readdirSync(dir).includes("保留的修改"), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});
test("an Obsidian edit is detected, survives later saves, and can be imported or set aside", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "life-os-vault-"));
  try {
    const mirror = new ObsidianMirror(dir);
    const data = fixture();
    mirror.sync(data, 1);
    edit(dir, "hello", "hello from notes");
    const [change] = mirror.changes(data);
    assert.equal(change.date, "2026-11-01");
    assert.deepEqual(change.fields.map((f) => [f.key, f.base, f.notes, f.app, f.conflict]), [["goodWhere", "hello", "hello from notes", "hello", false]]);
    mirror.sync(data, 2);
    assert.match(readFileSync(note(dir), "utf8"), /hello from notes/);
    assert.equal(mirror.changes(data).length, 1);
    data.entries[0].goodWhere = "hello from notes";
    assert.deepEqual(mirror.changes(data), []);
    mirror.sync(data, 3);
    assert.equal(existsSync(path.join(dir, "保留的修改")), false);
    edit(dir, "hello from notes", "second");
    mirror.discard("2026-11-01");
    assert.equal(readdirSync(path.join(dir, "保留的修改")).length, 1);
    mirror.sync(data, 4);
    assert.match(readFileSync(note(dir), "utf8"), /hello from notes/);
    assert.deepEqual(mirror.changes(data), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("edits on both sides of the same field are reported as a conflict; unrelated app edits are not", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "life-os-vault-"));
  try {
    const mirror = new ObsidianMirror(dir);
    const data = fixture();
    mirror.sync(data, 1);
    edit(dir, "hello", "notes");
    data.entries[0].goodKeep = "app only";
    assert.equal(mirror.changes(data)[0].fields[0].conflict, false);
    data.entries[0].goodWhere = "app";
    assert.equal(mirror.changes(data)[0].fields[0].conflict, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("broken note structure is never imported", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "life-os-vault-"));
  try {
    const mirror = new ObsidianMirror(dir);
    const data = fixture();
    mirror.sync(data, 1);
    edit(dir, "- **好在哪裡？**", "- 改掉標題");
    assert.deepEqual(mirror.changes(data), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("import API merges Obsidian edits, requires a choice on conflicts, and refuses stale revisions", async () => {
  const { createApp } = await import("../server.ts");
  const { PersonalStore } = await import("../server/personal-store.ts");
  const root = mkdtempSync(path.join(os.tmpdir(), "life-os-vault-api-"));
  const vault = path.join(root, "notes");
  const store = new PersonalStore(":memory:");
  const app = createApp({
    client: null,
    personal: { store, origin: "http://127.0.0.1:8765", obsidian: new ObsidianMirror(vault) },
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const base = "http://127.0.0.1:" + (server.address() as any).port;
  const headers = {
    "Content-Type": "application/json",
    Origin: "http://127.0.0.1:8765",
    "X-Requested-With": "life-os",
    Cookie: "life_os_session=" + store.newSession(),
  };
  const call = (url: string, init: any = {}) => fetch(base + url, { headers, ...init });
  try {
    let saved = await (await call("/api/data", { method: "PUT", body: JSON.stringify({ expectedRevision: 0, data: fixture() }) })).json();
    const file = path.join(vault, "01_日記/2026-11-01.md");
    writeFileSync(file, readFileSync(file, "utf8").replace("hello", "from notes"));
    const listed = await (await call("/api/obsidian/changes")).json();
    assert.equal(listed.changes[0].fields[0].notes, "from notes");
    assert.equal((await call("/api/obsidian/import", { method: "POST", body: JSON.stringify({ expectedRevision: saved.revision + 5 }) })).status, 409);
    assert.equal((await call("/api/obsidian/import", { method: "POST", body: JSON.stringify({ expectedRevision: saved.revision, choices: { "2026-11-01": "bogus" } }) })).status, 400);
    const result = await (await call("/api/obsidian/import", { method: "POST", body: JSON.stringify({ expectedRevision: saved.revision }) })).json();
    assert.equal(result.imported, 1);
    assert.equal(result.data.entries[0].goodWhere, "from notes");
    assert.equal(store.read().data.entries[0].goodWhere, "from notes");
    assert.deepEqual((await (await call("/api/obsidian/changes")).json()).changes, []);
    assert.equal(existsSync(path.join(vault, "保留的修改")), false);
    // conflict: both sides changed the same field
    const data = store.read().data;
    writeFileSync(file, readFileSync(file, "utf8").replace("from notes", "notes side"));
    data.entries[0].goodWhere = "app side";
    saved = await (await call("/api/data", { method: "PUT", body: JSON.stringify({ expectedRevision: store.read().revision, data }) })).json();
    assert.match(readFileSync(file, "utf8"), /notes side/);
    assert.equal((await call("/api/obsidian/import", { method: "POST", body: JSON.stringify({ expectedRevision: saved.revision }) })).status, 409);
    const kept = await (await call("/api/obsidian/import", { method: "POST", body: JSON.stringify({ expectedRevision: saved.revision, choices: { "2026-11-01": "app" } }) })).json();
    assert.equal(kept.kept, 1);
    assert.equal(store.read().data.entries[0].goodWhere, "app side");
    assert.equal(readdirSync(path.join(vault, "保留的修改")).length, 1);
    assert.match(readFileSync(file, "utf8"), /app side/);
  } finally {
    server.close();
    rmSync(root, { recursive: true, force: true });
  }
});
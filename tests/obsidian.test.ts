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

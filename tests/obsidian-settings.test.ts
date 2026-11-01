import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  changeNotesFolder,
  validateNotesFolder,
} from "../server/obsidian-settings.ts";
import { emptyData } from "../src/utils/validation.ts";
test("rejects folders that would include private database or project files", () => {
  const root = path.resolve("private-data");
  assert.throws(() => validateNotesFolder(root, root, path.resolve("project")));
  assert.throws(() =>
    validateNotesFolder(path.dirname(root), root, path.resolve("project")),
  );
  assert.throws(() =>
    validateNotesFolder(
      path.resolve("project/notes"),
      root,
      path.resolve("project"),
    ),
  );
  assert.doesNotThrow(() =>
    validateNotesFolder(
      path.join(root, "notes"),
      root,
      path.resolve("project"),
    ),
  );
  const project = path.resolve("project");
  const privateRoot = path.join(project, "Live-A-Better-Life-Data");
  assert.doesNotThrow(() => validateNotesFolder(path.join(privateRoot, "Notes"), privateRoot, project));
  assert.throws(() => validateNotesFolder(path.join(privateRoot, "Backups"), privateRoot, project));
});
test("changing folder exports data before persisting path, keeps old folder, preserves config", async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "life-os-folder-"));
  try {
    const dataRoot = path.join(temp, "private");
    fs.mkdirSync(dataRoot);
    const file = path.join(dataRoot, "config.json");
    fs.writeFileSync(
      file,
      JSON.stringify({
        Version: 1,
        NodePath: "unchanged",
        NotesRoot: path.join(dataRoot, "old"),
      }),
    );
    fs.mkdirSync(path.join(dataRoot, "old"));
    fs.writeFileSync(path.join(dataRoot, "old/keep.md"), "keep old notes");
    const target = path.join(temp, "chosen-日記");
    let registered = "";
    const mirror = await changeNotesFolder({
      root: target,
      dataRoot,
      projectRoot: path.join(temp, "project"),
      read: () => ({ data: emptyData(), revision: 3 }),
      register: async (root) => {
        registered = root;
      },
    });
    assert.equal(mirror.root, target);
    assert.equal(registered, target);
    assert.ok(fs.existsSync(path.join(target, "我的小改變.md")));
    const saved = JSON.parse(fs.readFileSync(file, "utf8"));
    assert.equal(saved.NotesRoot, target);
    assert.equal(saved.NodePath, "unchanged");
    assert.equal(
      fs.readFileSync(path.join(dataRoot, "old/keep.md"), "utf8"),
      "keep old notes",
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
test("failed registration leaves configured folder untouched", async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "life-os-folder-"));
  try {
    const file = path.join(temp, "config.json");
    fs.writeFileSync(file, JSON.stringify({ NotesRoot: "old" }));
    await assert.rejects(() =>
      changeNotesFolder({
        root: path.join(temp, "notes"),
        dataRoot: temp,
        projectRoot: path.join(temp, "project"),
        read: () => ({ data: emptyData(), revision: 0 }),
        register: async () => {
          throw new Error("failed");
        },
      }),
    );
    assert.equal(JSON.parse(fs.readFileSync(file, "utf8")).NotesRoot, "old");
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("folder selection returns the native dialog result and preserves cancellation", async () => {
  const { chooseNotesFolder } = await import("../server/obsidian-settings.ts");
  const selected = path.resolve("日記");
  assert.deepEqual(await chooseNotesFolder(selected, async initial => {
    assert.equal(initial, selected); return { path: selected };
  }), { path: selected });
  assert.deepEqual(await chooseNotesFolder(selected, async () => ({ path: null })), { path: null });
  await assert.rejects(() => chooseNotesFolder(selected, async () => ({ path: "relative" })));
});

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { ObsidianMirror } from "./obsidian.ts";
import type { LifeData } from "../src/utils/validation.ts";

const runFile = promisify(execFile);
const scripts = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../deploy/windows",
);
const powerShell = () =>
  path.join(
    process.env.SystemRoot || "C:\\Windows",
    "System32/WindowsPowerShell/v1.0/powershell.exe",
  );
const normalized = (value: string) =>
  process.platform === "win32"
    ? path.resolve(value).toLowerCase()
    : path.resolve(value);
const contains = (parent: string, child: string) =>
  child === parent || child.startsWith(parent + path.sep);

export function validateNotesFolder(
  root: string,
  dataRoot: string,
  projectRoot: string,
) {
  if (!root || !path.isAbsolute(root) || /[\u0000-\u001f"]/.test(root))
    throw new Error("請選擇有效的筆記資料夾。");
  const candidate = normalized(root);
  const isPrivateNotes = contains(normalized(path.join(dataRoot, "Notes")), candidate);
  if (
    candidate === normalized(path.parse(root).root) ||
    contains(candidate, normalized(dataRoot)) ||
    (contains(normalized(projectRoot), candidate) && !isPrivateNotes) ||
    contains(candidate, normalized(projectRoot))
  ) {
    throw new Error(
      "請選擇另一個專用資料夾，避免將程式或私人設定包含在筆記裡。",
    );
  }
}

async function openNativeFolderDialog(initialPath: string): Promise<{ path: string | null }> {
  if (process.platform !== "win32") throw new Error("請在這台 Windows 電腦上選擇資料夾，或直接輸入路徑。");
  const { stdout } = await runFile(powerShell(), [
    "-NoProfile", "-STA", "-WindowStyle", "Hidden", "-File",
    path.join(scripts, "Choose-NotesFolder.ps1"), "-InitialPath", initialPath,
  ], { windowsHide: true, timeout: 300000, maxBuffer: 32768 });
  return JSON.parse(stdout.replace(/^\uFEFF/, "").trim());
}
export async function chooseNotesFolder(
  root: string,
  open: (initialPath: string) => Promise<{ path: string | null }> = openNativeFolderDialog,
) {
  if (!path.isAbsolute(root) || /[\u0000-\u001f"]/.test(root)) throw new Error("請輸入完整的資料夾路徑。");
  const selected = await open(path.resolve(root));
  if (selected.path !== null && (typeof selected.path !== "string" || !path.isAbsolute(selected.path)))
    throw new Error("無法讀取選擇的資料夾。");
  return { path: selected.path };
}
export async function registerNotesFolder(root: string) {
  if (process.platform !== "win32") throw new Error("此設定僅適用 Windows。");
  await runFile(
    powerShell(),
    [
      "-NoProfile",
      "-WindowStyle",
      "Hidden",
      "-File",
      path.join(scripts, "Register-Vault.ps1"),
      "-VaultRoot",
      root,
    ],
    { windowsHide: true, timeout: 30000, maxBuffer: 32768 },
  );
}

export async function changeNotesFolder({
  root,
  dataRoot,
  projectRoot,
  read,
  register = registerNotesFolder,
}: {
  root: string;
  dataRoot: string;
  projectRoot: string;
  read: () => { data: LifeData; revision: number };
  register?: (root: string) => Promise<void>;
}) {
  validateNotesFolder(root, dataRoot, projectRoot);
  const settingsPath = path.join(dataRoot, "config.json");
  if (fs.lstatSync(settingsPath).isSymbolicLink())
    throw new Error("無法更新私人設定。");
  const settings = JSON.parse(
    fs.readFileSync(settingsPath, "utf8").replace(/^\uFEFF/, ""),
  );
  const mirror = new ObsidianMirror(path.resolve(root));
  // Stage the export first; leave the currently configured vault untouched on failure.
  let saved = read();
  mirror.sync(saved.data, saved.revision);
  await register(mirror.root);
  saved = read();
  mirror.sync(saved.data, saved.revision);
  const temporary = settingsPath + "." + randomUUID() + ".tmp";
  try {
    fs.writeFileSync(
      temporary,
      JSON.stringify({ ...settings, NotesRoot: mirror.root }, null, 2),
      { flag: "wx", mode: 0o600 },
    );
    fs.renameSync(temporary, settingsPath);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  return mirror;
}

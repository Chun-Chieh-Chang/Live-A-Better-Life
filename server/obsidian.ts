import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { isLifeData, type LifeData } from "../src/utils/validation.ts";
import {
  generateDailyNoteMarkdown,
  generatePersonalOSMarkdown,
  parseDailyNoteFields,
  editableKeys,
  FIELD_LABELS,
  type EditableKey,
} from "../src/utils/markdownExporter.ts";
const hash = (text: string | Buffer) => createHash("sha256").update(text).digest("hex");
const DIARY = /^01_日記\/(\d{4}-\d{2}-\d{2})\.md$/;
type Fields = Partial<Record<EditableKey, string>>;
export interface NoteChange {
  date: string;
  id: string;
  fields: { key: EditableKey; label: string; base: string; notes: string; app: string; conflict: boolean }[];
}
const entryFields = (entry: LifeData["entries"][number]): Fields =>
  Object.fromEntries(editableKeys(entry.state).map((k) => [k, ((entry as any)[k] || "").trim()]));
export class ObsidianMirror {
  readonly root: string;
  constructor(root: string) {
    if (!path.isAbsolute(root)) throw new Error("Vault root must be absolute");
    this.root = path.resolve(root);
  }
  private safe(relative: string) {
    const destination = path.resolve(this.root, relative);
    if (
      destination !== this.root &&
      !destination.startsWith(this.root + path.sep)
    )
      throw new Error("Unsafe vault path");
    let cursor = destination;
    while (cursor !== path.dirname(cursor)) {
      if (fs.existsSync(cursor) && fs.lstatSync(cursor).isSymbolicLink())
        throw new Error("Linked vault paths are not allowed");
      cursor = path.dirname(cursor);
    }
    return destination;
  }
  private write(relative: string, content: string | Buffer) {
    const file = this.safe(relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = this.safe(relative + "." + randomUUID() + ".tmp");
    try {
      fs.writeFileSync(temp, content, { flag: "wx", mode: 0o600 });
      fs.renameSync(temp, file);
    } finally {
      if (fs.existsSync(temp)) fs.unlinkSync(temp);
    }
  }
  private preserve(relative: string, content: Buffer) {
    this.write(
      "保留的修改/" +
        Date.now() +
        "-" +
        randomUUID() +
        "-" +
        path.basename(relative),
      content,
    );
  }
  private manifest() {
    const manifestPath = this.safe(".life-os-sync.json");
    let files: Record<string, string> = {};
    let base: Record<string, Fields> = {};
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      if (manifest.version !== 1 || typeof manifest.files !== "object" || !manifest.files)
        throw new Error("Invalid sync metadata");
      files = manifest.files;
      for (const [file, digest] of Object.entries(files))
        if (
          !(file === "我的小改變.md" || DIARY.test(file)) ||
          typeof digest !== "string"
        )
          throw new Error("Invalid managed file");
      if (manifest.base && typeof manifest.base === "object") base = manifest.base;
    }
    return { files, base };
  }
  /** Edits made in Obsidian to the user's own words that the app does not have yet. */
  private inspect(data: LifeData): NoteChange[] {
    const { files, base } = this.manifest();
    const changes: NoteChange[] = [];
    for (const entry of data.entries) {
      const relative = "01_日記/" + entry.date + ".md";
      const file = this.safe(relative);
      if (!files[relative] || !fs.existsSync(file)) continue;
      const current = fs.readFileSync(file);
      if (hash(current) === files[relative]) continue;
      const notes = parseDailyNoteFields(current.toString("utf8"), entry.state);
      if (!notes) continue;
      const app = entryFields(entry);
      const original = base[relative] ?? app;
      const fields = editableKeys(entry.state)
        .filter((k) => (notes[k] ?? "") !== (original[k] ?? "") && (notes[k] ?? "") !== (app[k] ?? ""))
        .map((k) => ({
          key: k,
          label: FIELD_LABELS[k],
          base: original[k] ?? "",
          notes: notes[k] ?? "",
          app: app[k] ?? "",
          conflict: (app[k] ?? "") !== (original[k] ?? ""),
        }));
      if (fields.length) changes.push({ date: entry.date, id: entry.id, fields });
    }
    return changes;
  }
  changes(data: LifeData) {
    return this.inspect(data);
  }
  /** Keeps the app's version: the notes edit is saved aside and the note is rewritten on the next sync. */
  discard(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date");
    const relative = "01_日記/" + date + ".md";
    const file = this.safe(relative);
    if (!fs.existsSync(file)) return;
    this.preserve(relative, fs.readFileSync(file));
    fs.unlinkSync(file);
  }
  sync(data: LifeData, revision: number) {
    if (!isLifeData(data) || !Number.isSafeInteger(revision) || revision < 0)
      throw new Error("Invalid exported data");
    this.safe(".");
    fs.mkdirSync(this.root, { recursive: true });
    const { files: old, base: oldBase } = this.manifest();
    const pending = new Set(this.inspect(data).map((c) => "01_日記/" + c.date + ".md"));
    const notes: Record<string, string> = {
      "我的小改變.md":
        "---\nlife_os_revision: " +
        revision +
        "\n---\n" +
        generatePersonalOSMarkdown(data.personalOS),
    };
    for (const entry of data.entries)
      notes["01_日記/" + entry.date + ".md"] =
        "---\nlife_os_id: " +
        JSON.stringify(entry.id) +
        "\nlife_os_revision: " +
        revision +
        "\n---\n" +
        generateDailyNoteMarkdown(entry, data.personalOS);
    const hashes: Record<string, string> = {};
    const base: Record<string, Fields> = {};
    const normalize = (text: string) =>
      text.replace(/\r\n/g, "\n").replace(/^life_os_revision: .*$/m, "");
    for (const [relative, content] of Object.entries(notes)) {
      const file = this.safe(relative);
      if (pending.has(relative)) {
        hashes[relative] = old[relative];
        base[relative] = oldBase[relative];
        continue;
      }
      if (fs.existsSync(file)) {
        const current = fs.readFileSync(file);
        if (
          hash(current) !== old[relative] &&
          !current.equals(Buffer.from(content)) &&
          normalize(current.toString("utf8")) !== normalize(content)
        )
          this.preserve(relative, current);
      }
      this.write(relative, content);
      hashes[relative] = hash(content);
      const date = DIARY.exec(relative)?.[1];
      const entry = date && data.entries.find((e) => e.date === date);
      if (entry) base[relative] = entryFields(entry);
    }
    for (const relative of Object.keys(old)) {
      if (notes[relative] !== undefined) continue;
      delete base[relative];
      const file = this.safe(relative);
      if (fs.existsSync(file)) {
        this.preserve(relative, fs.readFileSync(file));
        fs.unlinkSync(file);
      }
    }
    this.write(
      ".life-os-sync.json",
      JSON.stringify({ version: 1, revision, files: hashes, base }, null, 2),
    );
    const appConfig = this.safe(".obsidian/app.json");
    if (!fs.existsSync(appConfig)) this.write(".obsidian/app.json", "{}");
    return {
      status: "saved" as const,
      directory: this.root,
      revision,
      updatedAt: new Date().toISOString(),
      openUrl:
        "obsidian://open?path=" +
        encodeURIComponent(path.join(this.root, "我的小改變.md")),
    };
  }
}

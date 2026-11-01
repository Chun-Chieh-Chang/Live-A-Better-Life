import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { isLifeData, type LifeData } from "../src/utils/validation.ts";
import {
  generateDailyNoteMarkdown,
  generatePersonalOSMarkdown,
  parseDailyNoteFields,
  parsePersonalOSNote,
  personalOSFields,
  OS_LISTS,
  type OsList,
  type OsFields,
  editableKeys,
  FIELD_LABELS,
  type EditableKey,
} from "../src/utils/markdownExporter.ts";
const hash = (text: string | Buffer) => createHash("sha256").update(text).digest("hex");
const DIARY = /^01_日記\/(\d{4}-\d{2}-\d{2})\.md$/;
type Fields = Partial<Record<EditableKey, string>>;
const OS_FILE = "我的小改變.md";
const canon = (value: unknown): string =>
  JSON.stringify(value, (_k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1))) : v));
const relativeOf = (key: string) => (key === "os" ? OS_FILE : "01_日記/" + key + ".md");
type OsApply =
  | { op: "edit"; list: OsList; id: string; field: string; value: string }
  | { op: "add"; list: OsList; item: Record<string, string> }
  | { op: "remove"; list: OsList; id: string };
export interface NoteChange {
  /** The diary date, or "os" for the manual (我的小改變). */
  key: string;
  id: string;
  title: string;
  fields: { key: string; label: string; base: string; notes: string; app: string; conflict: boolean; apply?: OsApply }[];
}
const osBase = (data: LifeData) =>
  Object.fromEntries(
    Object.entries(personalOSFields(data.personalOS)).map(([list, items]) => [
      list,
      Object.fromEntries(items.map((i) => [i.id, i.fields])),
    ]),
  ) as Record<OsList, Record<string, Record<string, string>>>;
const summary = (fields: Record<string, string>) =>
  Object.entries(fields)
    .filter(([k, v]) => k !== "active" && v)
    .map(([, v]) => v)
    .join(" ／ ");
export function applyNoteChange(data: LifeData, change: NoteChange) {
  if (change.key !== "os") {
    const entry = data.entries.find((e) => e.id === change.id);
    if (!entry) return;
    for (const f of change.fields) {
      if (f.notes) (entry as any)[f.key] = f.notes;
      else delete (entry as any)[f.key];
    }
    entry.updatedAt = new Date().toISOString();
    return;
  }
  const typed = (list: OsList, fields: Record<string, string>) =>
    Object.fromEntries(
      Object.keys(OS_LISTS[list].fields).map((k) => [k, k === "active" ? fields[k] === "true" : fields[k] ?? ""]),
    );
  for (const f of change.fields) {
    const a = f.apply;
    if (!a) continue;
    const items = data.personalOS[a.list] as any[];
    if (a.op === "edit") {
      const item = items.find((i) => i.id === a.id);
      if (item) item[a.field] = a.field === "active" ? a.value === "true" : a.value;
    } else if (a.op === "add") items.push({ id: randomUUID(), ...typed(a.list, a.item), ...(a.list === "ifThenStrategies" ? { active: a.item.active === "true" } : {}) });
    else data.personalOS[a.list] = items.filter((i) => i.id !== a.id) as any;
  }
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
    let base: Record<string, any> = {};
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      if (manifest.version !== 1 || typeof manifest.files !== "object" || !manifest.files)
        throw new Error("Invalid sync metadata");
      files = manifest.files;
      for (const [file, digest] of Object.entries(files))
        if (
          !(file === OS_FILE || DIARY.test(file)) ||
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
      if (fields.length) changes.push({ key: entry.date, id: entry.id, title: entry.date, fields });
    }
    const manual = this.inspectManual(data, files, base);
    if (manual) changes.push(manual);
    return changes;
  }
  private inspectManual(data: LifeData, files: Record<string, string>, base: Record<string, any>): NoteChange | null {
    const file = this.safe(OS_FILE);
    if (!files[OS_FILE] || !fs.existsSync(file)) return null;
    const current = fs.readFileSync(file);
    if (hash(current) === files[OS_FILE]) return null;
    const notes = parsePersonalOSNote(current.toString("utf8"));
    const app = personalOSFields(data.personalOS);
    const roundTrip = parsePersonalOSNote(generatePersonalOSMarkdown(data.personalOS, true));
    if (!notes || canon(roundTrip) !== canon(app)) return null;
    const original: Record<string, Record<string, Record<string, string>>> | undefined = base[OS_FILE];
    const fields: NoteChange["fields"] = [];
    for (const list of Object.keys(OS_LISTS) as OsList[]) {
      const { title, fields: labels } = OS_LISTS[list];
      const appById = new Map(app[list].map((i) => [i.id!, i.fields]));
      const unmatched = new Map(appById);
      const seen = new Set<string>();
      for (const item of notes[list]) {
        if (item.id) {
          seen.add(item.id);
          const mine = appById.get(item.id);
          if (!mine) continue;
          unmatched.delete(item.id);
          const before = original?.[list]?.[item.id] ?? mine;
          for (const k of Object.keys(labels)) {
            const n = item.fields[k] ?? "";
            if (n === (before[k] ?? "") || n === (mine[k] ?? "")) continue;
            fields.push({
              key: `edit|${list}|${item.id}|${k}`,
              label: `${title}「${summary(mine)}」的${labels[k]}`,
              base: before[k] ?? "",
              notes: n,
              app: mine[k] ?? "",
              conflict: (mine[k] ?? "") !== (before[k] ?? ""),
              apply: { op: "edit", list, id: item.id, field: k, value: n },
            });
          }
        } else {
          const same = [...unmatched].find(([, f]) => canon(f) === canon(item.fields));
          if (same) { unmatched.delete(same[0]); continue; }
          if (!summary(item.fields)) continue;
          fields.push({
            key: `add|${list}|${fields.length}`,
            label: `新增${title}`,
            base: "",
            notes: summary(item.fields),
            app: "",
            conflict: false,
            apply: { op: "add", list, item: item.fields },
          });
        }
      }
      for (const [id, mine] of appById) {
        if (seen.has(id) || !original?.[list]?.[id]) continue;
        const before = original[list][id];
        fields.push({
          key: `remove|${list}|${id}`,
          label: `刪除${title}`,
          base: summary(before),
          notes: "（已刪除）",
          app: summary(mine),
          conflict: canon(mine) !== canon(before),
          apply: { op: "remove", list, id },
        });
      }
    }
    return fields.length ? { key: "os", id: "os", title: "我的小改變", fields } : null;
  }
  changes(data: LifeData) {
    return this.inspect(data);
  }
  /** Keeps the app's version: the notes edit is saved aside and the note is rewritten on the next sync. */
  discard(key: string) {
    if (key !== "os" && !/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error("Invalid date");
    const relative = relativeOf(key);
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
    const pending = new Set(this.inspect(data).map((c) => relativeOf(c.key)));
    const notes: Record<string, string> = {
      "我的小改變.md":
        "---\nlife_os_revision: " +
        revision +
        "\n---\n" +
        generatePersonalOSMarkdown(data.personalOS, true),
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
    const base: Record<string, any> = {};
    const normalize = (text: string) =>
      text
        .replace(/\r\n/g, "\n")
        .replace(/^life_os_revision: .*$/m, "")
        .replace(/ <!-- id:[^ >]+ -->/g, "")
        .replace(/^(- \[ \] 尚未新增策略|- \[ \] 尚未新增外掛提問|尚未新增配方|尚未新增避坑項目)$/gm, "")
        .replace(/\n{2,}/g, "\n\n")
        .trim();
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
      if (relative === OS_FILE) base[relative] = osBase(data);
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

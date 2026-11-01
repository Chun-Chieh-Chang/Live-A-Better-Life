import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { isLifeData, type LifeData } from "../src/utils/validation.ts";
import {
  generateDailyNoteMarkdown,
  generatePersonalOSMarkdown,
} from "../src/utils/markdownExporter.ts";
const hash = (text: string | Buffer) => createHash("sha256").update(text).digest("hex");
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
  sync(data: LifeData, revision: number) {
    if (!isLifeData(data) || !Number.isSafeInteger(revision) || revision < 0)
      throw new Error("Invalid exported data");
    this.safe(".");
    fs.mkdirSync(this.root, { recursive: true });
    const manifestPath = this.safe(".life-os-sync.json");
    let old: Record<string, string> = {};
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      if (
        manifest.version !== 1 ||
        typeof manifest.files !== "object" ||
        !manifest.files
      )
        throw new Error("Invalid sync metadata");
      old = manifest.files;
      for (const [file, digest] of Object.entries(old)) {
        if (
          !(
            file === "我的小改變.md" ||
            /^01_日記\/\d{4}-\d{2}-\d{2}\.md$/.test(file)
          ) ||
          typeof digest !== "string"
        )
          throw new Error("Invalid managed file");
      }
    }
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
    for (const [relative, content] of Object.entries(notes)) {
      const file = this.safe(relative);
      if (fs.existsSync(file)) {
        const current = fs.readFileSync(file);
        if (hash(current) !== old[relative] && !current.equals(Buffer.from(content)))
          this.preserve(relative, current);
      }
      this.write(relative, content);
      hashes[relative] = hash(content);
    }
    for (const relative of Object.keys(old)) {
      if (notes[relative] !== undefined) continue;
      const file = this.safe(relative);
      if (fs.existsSync(file)) {
        this.preserve(relative, fs.readFileSync(file));
        fs.unlinkSync(file);
      }
    }
    this.write(
      ".life-os-sync.json",
      JSON.stringify({ version: 1, revision, files: hashes }, null, 2),
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

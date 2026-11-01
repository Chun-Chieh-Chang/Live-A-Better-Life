import {
  existsSync,
  openSync,
  writeFileSync,
  fsyncSync,
  closeSync,
  readdirSync,
  lstatSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PersonalStore } from "../server/personal-store.ts";
export function scheduledBackup(
  dbPath: string,
  backupDir: string,
  now = new Date(),
  retentionDays = 30,
) {
  if (
    !path.isAbsolute(dbPath) ||
    !path.isAbsolute(backupDir) ||
    !existsSync(dbPath) ||
    !existsSync(backupDir)
  )
    throw new Error(
      "Existing absolute database and backup directory are required",
    );
  if (!Number.isInteger(retentionDays) || retentionDays < 1)
    throw new Error("Invalid retention policy");
  const store = new PersonalStore(dbPath);
  const filename = `life-os-${now.toISOString().replaceAll(":", "-")}-${randomUUID()}.json`;
  const destination = path.join(backupDir, filename);
  try {
    const body = JSON.stringify({
      version: "1.0",
      exportedAt: now.toISOString(),
      ...store.read().data,
    });
    const fd = openSync(destination, "wx", 0o600);
    try {
      writeFileSync(fd, body);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  } finally {
    store.close();
  }
  // Prune only our own regular backup files after a new export has succeeded.
  const cutoff = now.getTime() - retentionDays * 86400000;
  for (const name of readdirSync(backupDir)) {
    if (!/^life-os-\d{4}-\d{2}-\d{2}T[\d.-]+Z-[a-f0-9-]{36}\.json$/.test(name))
      continue;
    const file = path.join(backupDir, name),
      stat = lstatSync(file);
    if (stat.isFile() && !stat.isSymbolicLink() && stat.mtimeMs < cutoff)
      unlinkSync(file);
  }
  return destination;
}
import { pathToFileURL } from "node:url";
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (!process.env.LIFE_OS_DB_PATH || !process.env.LIFE_OS_BACKUP_DIR)
    throw new Error("Set LIFE_OS_DB_PATH and LIFE_OS_BACKUP_DIR");
  scheduledBackup(process.env.LIFE_OS_DB_PATH, process.env.LIFE_OS_BACKUP_DIR);
  console.log("Scheduled backup completed.");
}

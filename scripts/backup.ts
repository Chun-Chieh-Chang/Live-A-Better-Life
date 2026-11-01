import {
  existsSync,
  readFileSync,
  openSync,
  writeFileSync,
  fsyncSync,
  closeSync,
} from "node:fs";
import path from "node:path";
import { PersonalStore } from "../server/personal-store.ts";
import { parseBackup } from "../src/utils/validation.ts";
const [action, filename] = process.argv.slice(2);
const dbPath = process.env.LIFE_OS_DB_PATH;
if (
  !dbPath ||
  !path.isAbsolute(dbPath) ||
  !filename ||
  !path.isAbsolute(filename)
)
  throw new Error("Provide LIFE_OS_DB_PATH and an absolute backup file path");
if (action === "export") {
  if (!existsSync(dbPath)) throw new Error("Database does not exist");
  const store = new PersonalStore(dbPath);
  try {
    const backup = JSON.stringify({
      version: "1.0",
      exportedAt: new Date().toISOString(),
      ...store.read().data,
    });
    const fd = openSync(filename, "wx", 0o600);
    try {
      writeFileSync(fd, backup);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  } finally {
    store.close();
  }
  console.log("Backup exported. Store a copy on a separate protected volume.");
} else if (action === "restore") {
  if (existsSync(dbPath))
    throw new Error(
      "Restore requires a new database path; existing data will not be overwritten",
    );
  const data = parseBackup(readFileSync(filename, "utf8"));
  const store = new PersonalStore(dbPath);
  try {
    store.write(data, 0);
  } finally {
    store.close();
  }
  console.log(
    "Data restored into a new database. Configure the owner password before starting it.",
  );
} else
  throw new Error(
    "Usage: npm run backup -- export|restore /absolute/backup.json",
  );

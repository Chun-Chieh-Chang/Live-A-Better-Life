import { existsSync } from "node:fs";
// Password input is read only from stdin; never put it in command arguments or logs.
import { PersonalStore } from "../server/personal-store.ts";
const filename = process.env.LIFE_OS_DB_PATH;
if (!filename)
  throw new Error("Set LIFE_OS_DB_PATH to an absolute persistent-volume path");
if (process.argv.includes("--status")) {
  if (!existsSync(filename)) console.log("unconfigured");
  else {
    const existing = new PersonalStore(filename);
    try {
      console.log(existing.configured() ? "configured" : "unconfigured");
    } finally {
      existing.close();
    }
  }
} else {
  let password = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    password += chunk.toString();
    if (password.length > 258) throw new Error("Password too long");
  }
  password = password.replace(/\r?\n$/, "");
  const store = new PersonalStore(filename);
  try {
    await store.setPassword(password, process.argv.includes("--reset"));
    console.log("Owner password configured; previous sessions revoked.");
  } finally {
    password = "";
    store.close();
  }
}

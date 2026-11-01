// Private launcher IPC. stdout must be captured by the launcher, never logged.
import { randomBytes } from "node:crypto";
import { PersonalStore } from "../server/personal-store.ts";
const filename = process.env.LIFE_OS_DB_PATH;
if (!filename) throw new Error("Missing private database path");
const [action] = process.argv.slice(2);
const store = new PersonalStore(filename);
try {
  if (action === "prepare") {
    // Local automatic provisioning never changes an existing owner's password or data.
    if (!store.configured())
      await store.setPassword(randomBytes(48).toString("base64url"));
    process.stdout.write("configured");
  } else if (action === "grant") {
    process.stdout.write(JSON.stringify({ token: store.createDesktopGrant() }));
  } else throw new Error("Unsupported desktop operation");
} finally {
  store.close();
}

import test from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const password = "test-only-browser-password-123456";
test(
  "personal multi-device login → upload → conflict → backup restore → restart → logout",
  { timeout: 90000 },
  async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "life-os-browser-"));
    const env = {
      ...process.env,
      NODE_ENV: "production",
      GEMINI_API_KEY: "",
      AGNES_API_KEY: "",
      AI_PROVIDER: "auto",
      PORT: "3101",
      LIFE_OS_MODE: "personal",
      LIFE_OS_ORIGIN: "http://127.0.0.1:3101",
      LIFE_OS_DB_PATH: path.join(dir, "owner.sqlite"),
    };
    const base = env.LIFE_OS_ORIGIN;
    let server, browser;
    const stop = async () => {
      if (server) {
        const owned = server;
        server = undefined;
        owned.kill("SIGTERM");
        await new Promise((r) => owned.once("exit", r));
      }
    };
    const start = async () => {
      server = spawn(process.execPath, ["--import", "tsx", "server.ts"], {
        env,
        stdio: ["ignore", "pipe", "pipe"],
      });
      for (const stream of [server.stdout, server.stderr]) stream.resume();
      for (let i = 0; i < 100; i++) {
        if (server.exitCode !== null) throw new Error("Test server exited");
        try {
          if ((await fetch(base + "/healthz")).ok) return;
        } catch {}
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error("Test server readiness timed out");
    };
    try {
      execFileSync(
        process.execPath,
        ["--import", "tsx", "scripts/account.ts"],
        { env, input: password, stdio: ["pipe", "pipe", "pipe"] },
      );
      await start();
      browser = await chromium.launch({
        headless: true,
        channel: process.env.CHROMIUM_PATH ? undefined : "chrome",
        executablePath:
          process.env.CHROMIUM_PATH ||
          (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
        args: ["--no-sandbox"],
      });
      const first = await browser.newContext({ timezoneId: "Asia/Taipei" }),
        second = await browser.newContext({ timezoneId: "Asia/Taipei" });
      const one = await first.newPage(),
        two = await second.newPage();
      const errors = [];
      for (const p of [one, two]) {
        p.on("dialog", (d) => d.accept());
        p.on("pageerror", (e) => errors.push(e.message));
      }
      const login = async (p) => {
        await p.goto(base);
        await p.getByLabel("登入密碼").fill(password);
        await p.getByRole("button", { name: "登入", exact: true }).click();
        await p.getByRole("button", { name: "備份", exact: true }).click();
        await p
          .getByRole("button", { name: "存到個人空間", exact: true })
          .waitFor();
        await p
          .getByText(/已保存到個人空間|這裡和個人空間的內容不同/)
          .waitFor();
      };
      await one.goto(base);
      assert.equal(await one.locator("textarea").count(), 0);
      await one.getByLabel("登入密碼").fill(password);
      await one.getByRole("button", { name: "登入", exact: true }).click();
      await one.locator("textarea").first().waitFor();
      await one.getByText("已保存到個人空間", { exact: true }).waitFor();
      await one.locator("input[type=date]").fill("2026-10-12");
      await one.locator("textarea").first().fill("device-one-entry");
      await one
        .getByRole("button", { name: "儲存今天的記錄", exact: true })
        .click();
      await one.getByRole("button", { name: "備份", exact: true }).click();
      await one
        .getByRole("button", { name: "存到個人空間", exact: true })
        .click();
      await one.getByText("已上傳至個人空間。", { exact: true }).waitFor();
      await login(two);
      await two
        .getByRole("button", { name: "取回個人空間的記錄", exact: true })
        .click();
      await two
        .getByText("已下載個人空間版本至此裝置。", { exact: true })
        .waitFor();
      await two.getByRole("button", { name: "今天", exact: true }).click();
      await two.locator("input[type=date]").fill("2026-10-12");
      assert.equal(
        await two.locator("textarea").first().inputValue(),
        "device-one-entry",
      );
      await two.locator("textarea").first().fill("device-two-edit");
      await two
        .getByRole("button", { name: "儲存今天的記錄", exact: true })
        .click();
      await two.getByRole("button", { name: "備份", exact: true }).click();
      await two
        .getByRole("button", { name: "存到個人空間", exact: true })
        .click();
      await two.getByText("已上傳至個人空間。", { exact: true }).waitFor();
      await one
        .getByRole("button", { name: "存到個人空間", exact: true })
        .click();
      await one
        .getByText(
          "其他裝置已更新資料。此次操作未覆蓋個人空間；請重新整理版本後下載並比較。",
          { exact: true },
        )
        .waitFor();
      await one
        .getByRole("button", { name: "取回個人空間的記錄", exact: true })
        .click();
      await one
        .getByText("已下載個人空間版本至此裝置。", { exact: true })
        .waitFor();
      await one.getByRole("button", { name: "今天", exact: true }).click();
      assert.equal(
        await one.locator("textarea").first().inputValue(),
        "device-two-edit",
      );
      await one.getByRole("button", { name: "備份", exact: true }).click();
      await one.getByText("備份與其他選項", { exact: true }).click();
      await one
        .getByRole("button", { name: "檢查最新記錄", exact: true })
        .click();
      await one.getByText("已保存到個人空間", { exact: true }).waitFor();
      await one.getByText("找回之前的記錄", { exact: true }).click();
      await one
        .getByRole("button", { name: "還原這份記錄", exact: true })
        .first()
        .click();
      await one
        .getByText("個人空間已還原；請取回個人空間的記錄更新此裝置。", {
          exact: true,
        })
        .waitFor();
      await one
        .getByRole("button", { name: "取回個人空間的記錄", exact: true })
        .click();
      await one
        .getByText("已下載個人空間版本至此裝置。", { exact: true })
        .waitFor();
      await one.getByRole("button", { name: "今天", exact: true }).click();
      assert.equal(
        await one.locator("textarea").first().inputValue(),
        "device-one-entry",
      );
      // Restart the actual process using the same file database; clear only this disposable tab cache.
      await stop();
      await start();
      await one.evaluate(() => sessionStorage.clear());
      await one.reload();
      await one
        .getByText(/已保存到個人空間|這裡和個人空間的內容不同/)
        .waitFor();
      await one.getByRole("button", { name: "備份", exact: true }).click();
      await one
        .getByRole("button", { name: "取回個人空間的記錄", exact: true })
        .click();
      await one
        .getByText("已下載個人空間版本至此裝置。", { exact: true })
        .waitFor();
      await one.getByRole("button", { name: "今天", exact: true }).click();
      await one.locator("input[type=date]").fill("2026-10-12");
      assert.equal(
        await one.locator("textarea").first().inputValue(),
        "device-one-entry",
      );
      await one.getByRole("button", { name: "登出", exact: true }).click();
      await one.getByLabel("登入密碼").waitFor();
      assert.equal(await one.locator("textarea").count(), 0);
      assert.equal((await first.request.get(base + "/api/data")).status(), 401);
      assert.equal(
        await one.evaluate(
          () =>
            Object.keys(sessionStorage).filter((k) =>
              k.startsWith("life_os_personal_"),
            ).length,
        ),
        0,
      );
      assert.deepEqual(errors, []);
      console.log(
        "Verified: isolated devices, explicit transfer, CAS conflict, historical restore, process restart persistence, session revoke, cache cleanup.",
      );
    } finally {
      await browser?.close();
      await stop();
      rmSync(dir, { recursive: true, force: true });
    }
  },
);

test(
  "desktop launcher provisions and opens frontend without entering credentials",
  { timeout: 45000 },
  async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "life-os-desktop-browser-"));
    const env = {
      ...process.env,
      NODE_ENV: "production",
      GEMINI_API_KEY: "",
      AGNES_API_KEY: "",
      AI_PROVIDER: "auto",
      PORT: "3102",
      LIFE_OS_MODE: "personal",
      LIFE_OS_DESKTOP: "1",
      LIFE_OS_BIND: "127.0.0.1",
      LIFE_OS_ORIGIN: "http://127.0.0.1:3102",
      LIFE_OS_DB_PATH: path.join(dir, "owner.sqlite"),
    };
    const base = env.LIFE_OS_ORIGIN;
    let server, browser;
    const desktop = (action) =>
      execFileSync(
        process.execPath,
        ["--import", "tsx", "scripts/desktop.ts", action],
        { env, stdio: ["ignore", "pipe", "pipe"] },
      ).toString();
    try {
      desktop("prepare");
      desktop("prepare");
      server = spawn(process.execPath, ["--import", "tsx", "server.ts"], {
        env,
        stdio: ["ignore", "pipe", "pipe"],
      });
      server.stdout.resume();
      server.stderr.resume();
      let ready = false;
      for (let i = 0; i < 100; i++) {
        try {
          if ((await fetch(base + "/readyz")).ok) {
            ready = true;
            break;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 100));
      }
      assert.ok(ready);
      browser = await chromium.launch({
        headless: true,
        channel: process.env.CHROMIUM_PATH ? undefined : "chrome",
        executablePath:
          process.env.CHROMIUM_PATH ||
          (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
        args: ["--no-sandbox"],
      });
      const context = await browser.newContext();
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base);
      await page
        .getByRole("button", { name: "開啟我的日記", exact: true })
        .waitFor();
      assert.equal(
        await page.getByText("請雙擊專案中的", { exact: false }).count(),
        0,
      );
      const grant = JSON.parse(desktop("grant"));
      await page.goto(base + "/#desktop=" + grant.token);
      await page
        .getByRole("button", { name: "儲存今天的記錄", exact: true })
        .waitFor();
      assert.equal(new URL(page.url()).hash, "");
      assert.equal(await page.getByLabel("登入密碼").count(), 0);
      const privateData = await context.request.get(base + "/api/data");
      assert.equal(privateData.status(), 200);
      const replayContext = await browser.newContext();
      const replay = await replayContext.newPage();
      await replay.goto(base + "/#desktop=" + grant.token);
      await replay
        .getByRole("alert")
        .filter({ hasText: "自動登入連結已過期或已使用，請再按一次「開啟我的日記」。" })
        .waitFor();
      assert.equal(
        (await replayContext.request.get(base + "/api/data")).status(),
        401,
      );
      assert.equal(new URL(replay.url()).hash, "");
      assert.deepEqual(errors, []);
      console.log(
        "Verified: repeated unattended provisioning, browser login without password entry, credential removed from URL, replay refused.",
      );
    } finally {
      await browser?.close();
      if (server) {
        server.kill("SIGTERM");
        await new Promise((r) => server.once("exit", r));
      }
      rmSync(dir, { recursive: true, force: true });
    }
  },
);

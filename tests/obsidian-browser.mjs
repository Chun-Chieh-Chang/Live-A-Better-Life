import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
test(
  "save automatically reaches SQLite and Obsidian; edits are preserved; failures retry; stale devices cannot overwrite",
  { timeout: 90000 },
  async () => {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "life-os-obsidian-browser-"),
    );
    const vault = path.join(root, "notes");
    const db = path.join(root, "owner.sqlite");
    const base = "http://127.0.0.1:3103";
    const env = {
      ...process.env,
      GEMINI_API_KEY: "",
      AGNES_API_KEY: "",
      AI_PROVIDER: "auto",
      PORT: "3103",
      NODE_ENV: "production",
      LIFE_OS_MODE: "personal",
      LIFE_OS_DESKTOP: "1",
      LIFE_OS_ORIGIN: base,
      LIFE_OS_DB_PATH: db,
      LIFE_OS_NOTES_PATH: vault,
    };
    const command = (action) =>
      execFileSync(
        process.execPath,
        ["--import", "tsx", "scripts/desktop.ts", action],
        { env, encoding: "utf8" },
      );
    command("prepare");
    const server = spawn(process.execPath, ["--import", "tsx", "server.ts"], {
      env,
      stdio: "ignore",
    });
    let browser;
    const until = async (check) => {
      for (let i = 0; i < 100; i++) {
        if (await check()) return;
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error("Condition timed out");
    };
    try {
      await until(async () => {
        try {
          return (await fetch(base + "/readyz")).ok;
        } catch {
          return false;
        }
      });
      browser = await chromium.launch({ channel: "chrome", headless: true });
      const first = await browser.newContext({
        viewport: { width: 390, height: 900 },
        timezoneId: "Asia/Taipei",
      });
      const one = await first.newPage();
      one.on("dialog", (d) => d.accept());
      const token = JSON.parse(command("grant")).token;
      await one.goto(base + "/#desktop=" + token);
      await one
        .getByRole("button", { name: "儲存今天的記錄", exact: true })
        .waitFor();
      await one.locator("input[type=date]").fill("2026-11-01");
      await one.locator("textarea").first().fill("automatic-first");
      await one
        .getByRole("button", { name: "儲存今天的記錄", exact: true })
        .click();
      const note = path.join(vault, "01_日記/2026-11-01.md");
      await until(
        () =>
          fs.existsSync(note) &&
          fs.readFileSync(note, "utf8").includes("automatic-first"),
      );
      await one.getByText("筆記資料夾已更新。", { exact: false }).waitFor();

      const chosen = path.join(root, "chosen-日記");
      fs.mkdirSync(chosen);
      await one.getByText("變更筆記位置", { exact: true }).click();
      let pickerCalls = 0;
      // Real Windows dialog is verified on the interactive desktop; browser checks selected/cancelled results.
      await one.route("**/api/obsidian/choose-folder", async route => {
        pickerCalls++;
        await route.fulfill({json: {path: pickerCalls === 1 ? null : chosen}});
      });
      const beforeCancel = await one.getByLabel("資料夾路徑").inputValue();
      await one.getByRole("button", {name:"選擇資料夾",exact:true}).click();
      await one.getByRole("button", {name:"選擇資料夾",exact:true}).waitFor({state:"visible"});
      await until(async () => pickerCalls === 1 && await one.getByRole("button", {name:"選擇資料夾",exact:true}).isEnabled());
      assert.equal(await one.getByLabel("資料夾路徑").inputValue(), beforeCancel);
      await one.getByRole("button", {name:"選擇資料夾",exact:true}).click();
      await until(async () => await one.getByLabel("資料夾路徑").inputValue() === chosen);
      assert.equal(await one.getByRole("region", {name:"選擇筆記資料夾"}).count(), 0);
      fs.mkdirSync("Live-A-Better-Life-Data/Acceptance/browser/obsidian", { recursive: true });
      for (const width of [375, 390, 768, 1440]) {
        await one.setViewportSize({ width, height: 1000 });
        assert.ok(await one.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        for (const control of await one.getByRole("region", {name:"個人多裝置同步"}).locator('button:visible,input:visible').all()) {
          const box = await control.boundingBox(); assert.ok(box.height >= 44);
          assert.ok(await control.evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 14));
        }
        await one.getByRole("region", {name:"個人多裝置同步"}).screenshot({path:"Live-A-Better-Life-Data/Acceptance/browser/obsidian/location-"+width+".png"});
      }
      // Native app registration is covered separately; exercise the browser's folder-setting boundary here.
      await one.route("**/api/obsidian/location", async (route) => {
        assert.equal(route.request().postDataJSON().path, chosen);
        await route.fulfill({
          json: { status: "saved", directory: chosen, revision: 1 },
        });
      });
      await one
        .getByRole("button", { name: "使用這個位置", exact: true })
        .click();
      await one
        .getByText("筆記位置已更新，之後會自動保存到這裡。", { exact: true })
        .waitFor();
      await one.unroute("**/api/obsidian/location");
      await one.reload();
      await one
        .getByRole("button", { name: "儲存今天的記錄", exact: true })
        .waitFor();
      const second = await browser.newContext({ timezoneId: "Asia/Taipei" });
      const two = await second.newPage();
      two.on("dialog", (d) => d.accept());
      await two.goto(base + "/#desktop=" + JSON.parse(command("grant")).token);
      await two.locator("textarea").first().waitFor();
      assert.equal(
        await two.locator("textarea").first().inputValue(),
        "automatic-first",
      );
      fs.writeFileSync(note, "edited-in-Obsidian");
      await one.locator("textarea").first().fill("automatic-second");
      await one
        .getByRole("button", { name: "儲存今天的記錄", exact: true })
        .click();
      await until(() =>
        fs.readFileSync(note, "utf8").includes("automatic-second"),
      );
      assert.ok(
        fs
          .readdirSync(path.join(vault, "保留的修改"))
          .some(
            (n) =>
              fs.readFileSync(path.join(vault, "保留的修改", n), "utf8") ===
              "edited-in-Obsidian",
          ),
      );
      fs.renameSync(vault, vault + ".old");
      fs.writeFileSync(vault, "blocked");
      await one.locator("textarea").first().fill("automatic-third");
      await one
        .getByRole("button", { name: "儲存今天的記錄", exact: true })
        .click();
      await one
        .getByRole("button", { name: "重試更新筆記", exact: true })
        .waitFor();
      fs.unlinkSync(vault);
      fs.renameSync(vault + ".old", vault);
      await one
        .getByRole("button", { name: "重試更新筆記", exact: true })
        .click();
      await until(() =>
        fs.readFileSync(note, "utf8").includes("automatic-third"),
      );
      await two.locator("textarea").first().fill("stale-must-not-overwrite");
      await two
        .getByRole("button", { name: "儲存今天的記錄", exact: true })
        .click();
      await two
        .getByText("有內容尚未保存到個人空間。", { exact: false })
        .waitFor();
      assert.ok(
        !fs.readFileSync(note, "utf8").includes("stale-must-not-overwrite"),
      );
      console.log(
        "Verified: automatic save to notes, initial hydration, external edit preservation, failure visibility/retry and conflict protection.",
      );
    } finally {
      await browser?.close();
      const exited = new Promise((r) => server.once("exit", r));
      server.kill();
      await exited;
      fs.rmSync(root, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
    }
  },
);

import { test as nodeTest, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { chromium } from "playwright";

const test = (name, run) => nodeTest(name, { timeout: 30000 }, run);
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
let server,
  browser,
  logs = "";
before(async () => {
  if (!process.env.TEST_BASE_URL) {
    server = spawn(process.execPath, ["--import", "tsx", "server.ts"], {
      env: {
        ...process.env,
        PORT: "3100",
        LIFE_OS_MODE: "local",
        GEMINI_API_KEY: "",
      AGNES_API_KEY: "",
      AI_PROVIDER: "auto",
        NODE_ENV: process.env.TEST_SERVER_MODE || "production",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    for (const stream of [server.stdout, server.stderr])
      stream.on("data", (chunk) => {
        logs = (logs + chunk.toString()).slice(-4000);
      });
  }
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + "/api/system/status")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(ready, `server startup failed: ${logs}`);
  browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROMIUM_PATH ||
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    args: ["--no-sandbox"],
  });
});
after(async () => {
  await browser?.close();
  if (server) {
    server.kill("SIGTERM");
    await new Promise((r) => server.once("exit", r));
  }
});
async function fresh(run) {
  const context = await browser.newContext({ timezoneId: "Asia/Taipei" });
  const page = await context.newPage();
  let accept = true;
  page.on("dialog", (d) =>
    d.type() === "beforeunload" || accept ? d.accept() : d.dismiss(),
  );
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(base);
    await page.locator("textarea").first().waitFor();
    await run(page, context, (value) => {
      accept = value;
    });
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
}
const daily = (p) =>
  p.getByRole("button", { name: "今天", exact: true }).click();
const exportTab = (p) =>
  p.getByRole("button", { name: "備份", exact: true }).click();
const getData = (p) =>
  p.evaluate(() => JSON.parse(localStorage.getItem("life_os_data_v2"))?.data);
const waitText = (p, t) => p.getByText(t, { exact: false }).first().waitFor();
const upload = (p, v) =>
  p
    .locator("input[type=file]")
    .setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(v)),
    });
const empty = {
  version: "1.0",
  entries: [],
  personalOS: {
    ifThenStrategies: [],
    habitQuestions: [],
    emergencyRecipes: [],
    avoidanceGuides: [],
  },
};

test("empty startup → unavailable AI → save → reload → history", () =>
  fresh(async (p) => {
    assert.equal(await getData(p), undefined);
    assert.match(await p.locator("header").innerText(), /0 天/);
    await p.locator("input[type=date]").fill("2026-10-01");
    await p.locator("textarea").first().fill("real-entry");
    await p.getByRole("button", { name: "幫我想想怎麼延續" }).click();
    await waitText(p, "AI 目前無法提供建議");
    assert.equal(await p.getByRole('button', {name:'採用填入', exact:true}).count(), 0);
    assert.equal(
      await p.locator("textarea").first().inputValue(),
      "real-entry",
    );
    await p.getByRole("button", { name: "儲存今天的記錄", exact: true }).click();
    await waitText(p, "已儲存");
    const saved = await getData(p);
    assert.equal(saved.entries.length, 1);
    assert.equal(saved.personalOS.ifThenStrategies.length, 0);
    assert.equal(saved.entries[0].aiAdvice, undefined);
    await p.reload();
    await p.locator("textarea").first().waitFor();
    assert.deepEqual(await getData(p), saved);
    await p
      .getByRole("button", { name: "生活回顧", exact: true })
      .click();
    await p.getByRole("button", { name: "查看這天的記錄" }).click();
    assert.equal(
      await p.locator("input[type=date]").inputValue(),
      "2026-10-01",
    );
    assert.equal(
      await p.locator("textarea").first().inputValue(),
      "real-entry",
    );
  }));

test("drafts survive tab/date changes and reload without becoming recorded entries", () =>
  fresh(async (p) => {
    await p.locator("input[type=date]").fill("2026-10-02");
    await p.locator("textarea").first().fill("draft-A");
    await p
      .getByRole("button", { name: "我的小改變", exact: true })
      .click();
    await daily(p);
    assert.equal(await p.locator("textarea").first().inputValue(), "draft-A");
    await p.locator("input[type=date]").fill("2026-10-03");
    await p.locator("textarea").first().fill("draft-B");
    await p.locator("input[type=date]").fill("2026-10-02");
    assert.equal(await p.locator("textarea").first().inputValue(), "draft-A");
    await p.reload();
    await p.locator("input[type=date]").fill("2026-10-03");
    assert.equal(await p.locator("textarea").first().inputValue(), "draft-B");
    assert.equal(await getData(p), undefined);
  }));

test("write failure cannot report success or replace saved data; retry works", () =>
  fresh(async (p) => {
    await p.locator("textarea").first().fill("first");
    await p.getByRole("button", { name: "儲存今天的記錄", exact: true }).click();
    await waitText(p, "已儲存");
    const before = await getData(p);
    await p.evaluate(() => {
      window.originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === "life_os_data_v2") throw new DOMException("quota");
        return window.originalSetItem.call(this, k, v);
      };
    });
    await p.locator("textarea").first().fill("edited");
    await p.getByRole("button", { name: "儲存今天的記錄", exact: true }).click();
    await waitText(p, "日誌未保存");
    assert.deepEqual(await getData(p), before);
    assert.equal(await p.getByText("已儲存").count(), 0);
    assert.equal(await p.locator("textarea").first().inputValue(), "edited");
    await p.evaluate(() => {
      Storage.prototype.setItem = window.originalSetItem;
    });
    await p.getByRole("button", { name: "儲存今天的記錄", exact: true }).click();
    await waitText(p, "已儲存");
    assert.equal((await getData(p)).entries[0].goodWhere, "edited");
  }));

test("backup rejects bad schema, cancellation preserves data, restore keeps downloadable recovery", () =>
  fresh(async (p, _ctx, confirm) => {
    await p.locator("textarea").first().fill("backup-me");
    await p.getByRole("button", { name: "儲存今天的記錄", exact: true }).click();
    const before = await getData(p);
    await exportTab(p);
    const download = p.waitForEvent("download");
    await p.getByRole("button", { name: "下載完整備份", exact: true }).click();
    const d = await download;
    const stream = await d.createReadStream();
    let raw = "";
    for await (const c of stream) raw += c;
    const backup = JSON.parse(raw);
    assert.deepEqual(backup.entries, before.entries);
    await upload(p, { version: "1.0", entries: [{}], personalOS: {} });
    await waitText(p, "無法還原");
    assert.deepEqual(await getData(p), before);
    confirm(false);
    await upload(p, empty);
    await waitText(p, "已取消");
    assert.deepEqual(await getData(p), before);
    confirm(true);
    await upload(p, empty);
    await waitText(p, "已還原你的記錄");
    assert.equal((await getData(p)).entries.length, 0);
    assert.deepEqual(
      await p.evaluate(
        () =>
          JSON.parse(localStorage.getItem("life_os_before_import_v1")).entries,
      ),
      before.entries,
    );
    await upload(p, backup);
    await waitText(p, "已還原你的記錄");
    await daily(p);
    assert.equal(await p.locator("textarea").first().inputValue(), "backup-me");
  }));

test("delayed AI cannot write into a different date or mood", () =>
  fresh(async (p) => {
    let reply;
    await p.route("**/api/coach", async (route) => {
      await new Promise((r) => {
        reply = r;
      });
      await route
        .fulfill({
          json: {
            success: true,
            isFallback: false,
            result: {
              strategies: ["If stale, Then wrong"],
              psychologicalInsight: "stale-marker",
            },
          },
        })
        .catch(() => {});
    });
    await p.getByRole("button", { name: "幫我想想怎麼延續" }).click();
    while (!reply) await new Promise((r) => setTimeout(r, 10));
    await p.locator("input[type=date]").fill("2026-10-04");
    reply();
    await p.waitForTimeout(150);
    assert.equal(await p.getByText("stale-marker", { exact: true }).count(), 0);
    reply = undefined;
    await p.getByRole("button", { name: "幫我想想怎麼延續" }).click();
    while (!reply) await new Promise((r) => setTimeout(r, 10));
    await p.getByRole("button", { name: "不好", exact: true }).click();
    reply();
    await p.waitForTimeout(150);
    assert.equal(await p.getByText("stale-marker", { exact: true }).count(), 0);
  }));

test("malformed AI responses show no advice instead of crashing", () =>
  fresh(async (p) => {
    await p.route("**/api/coach", (r) =>
      r.fulfill({ json: { success: true, result: {} } }),
    );
    await p.getByRole("button", { name: "幫我想想怎麼延續" }).click();
    await waitText(p, "AI 目前無法提供建議");
    assert.equal(
      await p.getByRole("button", { name: "採用填入", exact: true }).count(),
      0,
    );
  }));

test("another tab changing committed data blocks silent overwrite", () =>
  fresh(async (p, context) => {
    const other = await context.newPage();
    await other.goto(base);
    await other.locator("textarea").first().waitFor();
    await p.locator("textarea").first().fill("tab-one");
    await p.getByRole("button", { name: "儲存今天的記錄", exact: true }).click();
    await other.locator("textarea").first().fill("tab-two");
    await other
      .getByRole("button", { name: "儲存今天的記錄", exact: true })
      .click();
    await waitText(other, "另一個分頁已修改資料");
    assert.equal((await getData(p)).entries[0].goodWhere, "tab-one");
  }));

test("unreadable committed data stays intact and blocks writes", () =>
  fresh(async (p) => {
    await p.evaluate(() =>
      localStorage.setItem("life_os_data_v2", "broken-data"),
    );
    await p.reload();
    await waitText(p, "無法讀取本機資料");
    await p.getByRole("button", { name: "儲存今天的記錄", exact: true }).click();
    assert.equal(
      await p.evaluate(() => localStorage.getItem("life_os_data_v2")),
      "broken-data",
    );
    assert.equal(await p.getByText("已儲存").count(), 0);
  }));

test("failed pre-import backup aborts replacement and preserves pending drafts", () =>
  fresh(async (p) => {
    await p.locator("textarea").first().fill("original");
    await p.getByRole("button", { name: "儲存今天的記錄", exact: true }).click();
    const before = await getData(p);
    await p.locator("textarea").first().fill("pending-draft");
    await p.evaluate(() => {
      window.originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === "life_os_before_import_v1") throw new DOMException("quota");
        return window.originalSetItem.call(this, k, v);
      };
    });
    await exportTab(p);
    await upload(p, empty);
    await waitText(p, "無法還原");
    assert.deepEqual(await getData(p), before);
    await p.evaluate(() => {
      Storage.prototype.setItem = window.originalSetItem;
    });
    await upload(p, empty);
    await waitText(p, "已還原你的記錄");
    await daily(p);
    assert.equal(await p.locator("textarea").first().inputValue(), "");
    assert.ok(
      await p.evaluate(() =>
        Object.keys(localStorage).some((k) =>
          k.startsWith("life_os_draft_v1_default_"),
        ),
      ),
    );
  }));

test('quota-blocked drafts remain in memory across date changes',()=>fresh(async p=>{
  await p.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('quota');};});
  await p.locator('input[type=date]').fill('2026-10-05');await p.locator('textarea').first().fill('memory-only-draft');await waitText(p,'草稿尚未保存');
  await p.locator('input[type=date]').fill('2026-10-06');await p.locator('input[type=date]').fill('2026-10-05');assert.equal(await p.locator('textarea').first().inputValue(),'memory-only-draft');
  await p.evaluate(()=>{Storage.prototype.setItem=window.originalSetItem;});await p.getByRole('button',{name:'儲存今天的記錄',exact:true}).click();await waitText(p,'已儲存');assert.equal((await getData(p)).entries[0].goodWhere,'memory-only-draft');
}));

test('unavailable service status stays honest and repair failure is visible',()=>fresh(async p=>{
 await p.route('**/api/system/status',r=>r.abort());await p.reload();
 await p.getByRole('button',{name:'更多',exact:true}).click();await p.getByRole('button',{name:'使用狀態',exact:true}).click();
 await waitText(p,'暫時無法確認連線');
 await p.route('**/api/system/setup',r=>r.fulfill({status:503,json:{success:false}}));
 await p.getByRole('button',{name:'嘗試修復',exact:true}).click();await waitText(p,'還沒準備好');
 assert.equal(await p.getByText('已完成檢查。',{exact:true}).count(),0);
}));

test('unavailable AI stays usable without horizontal overflow at supported widths', () =>
  fresh(async p => {
    for (const width of [375,390,768,1440]) {
      await p.setViewportSize({width,height:900});
      await p.getByRole('button',{name:'幫我想想怎麼延續'}).click();
      await waitText(p,'AI 目前無法提供建議');
      assert.equal(await p.getByRole('button',{name:'採用填入',exact:true}).count(),0);
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
  }));

test('successful AI response is visible and can be adopted', () => fresh(async p => {
  await p.route('**/api/coach', route => route.fulfill({json:{success:true,isFallback:false,source:'agnes',result:{strategies:['If 下次找供應商，Then 先列出一項待查證的資格。'],psychologicalInsight:'你用工具推進了工作。'}}}));
  await p.locator('textarea').first().fill('用工具找到供應商');
  await p.getByRole('button',{name:'幫我想想怎麼延續'}).click();
  await waitText(p,'你用工具推進了工作。');
  await p.getByRole('button',{name:'採用填入',exact:true}).click();
  assert.match(await p.locator('textarea').nth(1).inputValue(),/供應商/);
}));

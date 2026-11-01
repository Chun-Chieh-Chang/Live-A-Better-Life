import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyData,
  isLifeData,
  isDate,
  isCoachResult,
  parseBackup,
} from "../src/utils/validation";
import {
  DATA_KEY,
  RECOVERY_KEY,
  loadData,
  saveData,
  restoreBackup,
} from "../src/utils/storage";
import { createApp } from "../server";
import { askAICoach } from "../src/services/coachService";
import { INITIAL_ENTRIES, INITIAL_PERSONAL_OS } from "../src/data/initialData";

class MemoryStorage {
  map = new Map<string, string>();
  fail = "";
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    if (k === this.fail) throw new Error("quota");
    this.map.set(k, v);
  }
}
const fixture = () => ({
  entries: [structuredClone(INITIAL_ENTRIES[0])],
  personalOS: structuredClone(INITIAL_PERSONAL_OS),
});
const storage = () => new MemoryStorage() as MemoryStorage & Storage;

test("empty startup and one-entry reload never inject samples", () => {
  const s = storage();
  assert.deepEqual(loadData(s), emptyData());
  saveData(s, fixture());
  assert.deepEqual(loadData(s), fixture());
  assert.equal(loadData(s).entries.length, 1);
});
test("legacy migration preserves entries and source keys without supplement", () => {
  const s = storage();
  s.setItem("life_os_daily_entries_v1", JSON.stringify(fixture().entries));
  s.setItem("life_os_personal_manual_v1", JSON.stringify(fixture().personalOS));
  assert.deepEqual(loadData(s), fixture());
  assert.equal(s.getItem(DATA_KEY), null);
  saveData(s, loadData(s));
  assert.ok(s.getItem("life_os_daily_entries_v1"));
});
test("corrupt and unsupported data is rejected without overwriting", () => {
  const s = storage();
  for (const raw of [
    "broken",
    JSON.stringify({ version: 99, data: emptyData() }),
  ]) {
    s.setItem(DATA_KEY, raw);
    assert.throws(() => loadData(s));
    assert.equal(s.getItem(DATA_KEY), raw);
  }
});
test("failed writes preserve committed data; backup failure aborts restore", () => {
  const s = storage();
  saveData(s, fixture());
  const before = s.getItem(DATA_KEY);
  s.fail = DATA_KEY;
  assert.throws(() => saveData(s, emptyData()));
  assert.equal(s.getItem(DATA_KEY), before);
  s.fail = RECOVERY_KEY;
  assert.throws(() => restoreBackup(s, fixture(), emptyData()));
  assert.equal(s.getItem(DATA_KEY), before);
});
test("backup round trip and pre-import recovery are exact", () => {
  const s = storage();
  saveData(s, fixture());
  const restored = parseBackup(
    JSON.stringify({ version: "1.0", ...fixture() }),
  );
  restoreBackup(s, fixture(), emptyData());
  assert.deepEqual(parseBackup(s.getItem(RECOVERY_KEY)!), restored);
  assert.deepEqual(loadData(s), emptyData());
});
test("bad dates, duplicates, missing fields and malformed advice rejected", () => {
  assert.equal(isDate("2026-02-30"), false);
  assert.equal(isDate("2024-02-29"), true);
  for (const v of [
    { version: "1.0", entries: {}, personalOS: {} },
    { version: "2.0", ...fixture() },
    {
      version: "1.0",
      ...fixture(),
      entries: [...fixture().entries, ...fixture().entries],
    },
  ])
    assert.throws(() => parseBackup(JSON.stringify(v)));
  assert.equal(
    isLifeData({
      ...fixture(),
      entries: [{ ...fixture().entries[0], aiAdvice: {} }],
    }),
    false,
  );
  assert.equal(
    isCoachResult({ strategies: "wrong", psychologicalInsight: "test" }),
    false,
  );
});

async function withApp(
  client: any,
  run: (base: string) => Promise<void>,
  timeoutMs = 50,
) {
  const server = createApp({ client, timeoutMs }).listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const addr = server.address() as { port: number };
  try {
    await run(`http://127.0.0.1:${addr.port}`);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
  }
}
const post = (base: string, path: string, body: unknown) =>
  fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const request = {
  state: "good",
  data: { goodWhere: "test" },
  personalOS: fixture().personalOS,
};
test("API rejects malformed requests and distinguishes no-key readiness", async () => {
  await withApp(null, async (base) => {
    for (const body of [
      {},
      { state: "unknown", data: {} },
      { state: "bad", data: null },
      { ...request, personalOS: {} },
    ]) {
      const res = await post(base, "/api/coach", body);
      assert.equal(res.status, 400);
      assert.equal((await res.json()).success, false);
    }
    for (const state of ["good", "bad", "normal"]) {
      const res = await post(base, "/api/coach", { ...request, state });
      const j = await res.json();
      assert.equal(res.status, 200);
      assert.equal(j.isFallback, true);
      assert.ok(isCoachResult(j.result));
    }
    const probe = await post(base, "/api/system/test-ai", {});
    assert.equal(probe.status, 503);
    assert.equal((await probe.json()).mode, "unconfigured");
  });
});
test("model success validates structured response and forwards user/manual context", async () => {
  let prompt = "";
  const result = {
    strategies: ["If test, Then act"],
    psychologicalInsight: "insight",
  };
  await withApp(
    {
      models: {
        generateContent: async (args: any) => {
          prompt = args.contents;
          return { text: JSON.stringify(result) };
        },
      },
    },
    async (base) => {
      const j = await (await post(base, "/api/coach", request)).json();
      assert.equal(j.isFallback, false);
      assert.deepEqual(j.result, result);
      assert.match(prompt, /test/);
      assert.ok(prompt.includes(request.personalOS.ifThenStrategies[0].ifText));
    },
  );
});
test("remote failures, malformed JSON, wrong schema, and timeout fall back without leaking errors", async () => {
  for (const generateContent of [
    async () => {
      throw new Error("private-diagnostic");
    },
    async () => ({ text: "invalid json" }),
    async () => ({ text: "{}" }),
    () => new Promise(() => {}),
  ]) {
    await withApp(
      { models: { generateContent } },
      async (base) => {
        const r = await post(base, "/api/coach", request);
        const raw = await r.text();
        const j = JSON.parse(raw);
        assert.equal(j.isFallback, true);
        assert.ok(isCoachResult(j.result));
        assert.ok(!raw.includes("private-diagnostic"));
        const probe = await post(base, "/api/system/test-ai", {});
        if (
          generateContent.toString().includes("private-diagnostic") ||
          generateContent.toString().includes("new Promise")
        )
          assert.equal(probe.status, 503);
      },
      20,
    );
  }
});
test("browser service validates remote results and labels local fallback", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ success: true, result: {} }), {
        status: 200,
      });
    assert.equal(
      (await askAICoach("good", {}, fixture().personalOS)).source,
      "local-fallback",
    );
    globalThis.fetch = async () => {
      throw new Error("offline");
    };
    assert.equal(
      (await askAICoach("bad", {}, fixture().personalOS)).source,
      "local-fallback",
    );
    const cancelled = new AbortController();
    cancelled.abort();
    await assert.rejects(
      askAICoach("good", {}, fixture().personalOS, undefined, cancelled.signal),
      { name: "AbortError" },
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('browser request timeout returns explicit local fallback', async (t) => {
  const originalFetch = globalThis.fetch;
  t.mock.timers.enable({apis:['setTimeout']});
  try {
    globalThis.fetch = async (_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('timeout', 'AbortError')), {once:true});
    });
    let complete = false;
    const pending = askAICoach('normal', {}, fixture().personalOS).then(result => {complete = true; return result;});
    t.mock.timers.tick(11999); await Promise.resolve(); assert.equal(complete, false);
    t.mock.timers.tick(1);
    const response = await pending;
    assert.equal(response.source, 'local-fallback'); assert.ok(isCoachResult(response.result));
  } finally {globalThis.fetch = originalFetch; t.mock.timers.reset();}
});

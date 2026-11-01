import test from "node:test";
import assert from "node:assert/strict";
import { createAgnesClient, selectAI } from "../server/ai-provider.ts";
import { createApp } from "../server.ts";
test("Agnes is preferred when configured; explicit provider never switches providers", () => {
  const env = { AGNES_API_KEY: "test-agnes", GEMINI_API_KEY: "test-gemini" };
  assert.equal(selectAI(env).provider, "agnes");
  assert.equal(selectAI(env).model, "agnes-3.0-flash");
  assert.equal(selectAI({ ...env, AI_PROVIDER: "gemini" }).provider, "gemini");
  assert.equal(
    selectAI({ AI_PROVIDER: "agnes", GEMINI_API_KEY: "test" }).client,
    null,
  );
});
test("Agnes uses bearer auth, selected model, bounded request and returns only response text", async () => {
  let captured: any;
  const client = createAgnesClient({
    apiKey: "test-secret",
    fetchImpl: async (url: any, init: any) => {
      captured = { url, init };
      return new Response(
        JSON.stringify({ choices: [{ message: { content: "pong" } }] }),
      );
    },
  });
  assert.equal(
    (
      await client.models.generateContent({
        model: "agnes-3.0-flash",
        contents: "test",
        config: { maxOutputTokens: 2000 },
      })
    ).text,
    "pong",
  );
  assert.equal(captured.url, "https://apihub.agnes-ai.com/v1/chat/completions");
  assert.equal(captured.init.headers.Authorization, "Bearer test-secret");
  const body = JSON.parse(captured.init.body);
  assert.equal(body.model, "agnes-3.0-flash");
  assert.equal(body.messages[0].content, "test");
  assert.equal(body.stream, false);
  assert.equal(body.max_tokens, 2000);
  assert.ok(captured.init.signal);
  assert.equal(captured.init.redirect, "error");
});
test("Agnes failures and malformed responses do not expose upstream content", async () => {
  for (const response of [
    new Response("sensitive upstream text", { status: 401 }),
    new Response(JSON.stringify({ choices: [] })),
  ]) {
    const client = createAgnesClient({
      apiKey: "test-secret",
      fetchImpl: async () => response,
    });
    await assert.rejects(
      () =>
        client.models.generateContent({
          model: "agnes-3.0-flash",
          contents: "test",
        }),
      (e) =>
        !String(e).includes("sensitive") && !String(e).includes("test-secret"),
    );
  }
});
test("Agnes coaching retains validation and accurate source on success and fallback", async () => {
  for (const good of [true, false]) {
    const client = createAgnesClient({
      apiKey: "test-secret",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: good
                    ? JSON.stringify({
                        strategies: ["If test, Then act"],
                        psychologicalInsight: "test",
                      })
                    : "bad json",
                },
              },
            ],
          }),
        ),
    });
    const server = createApp({ client, provider: "agnes" }).listen(
      0,
      "127.0.0.1",
    );
    await new Promise<void>((r) => server.once("listening", r));
    try {
      const port = (server.address() as any).port;
      const response = await fetch("http://127.0.0.1:" + port + "/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: "good",
          data: { goodWhere: "synthetic test" },
        }),
      });
      const result = await response.json();
      assert.equal(result.isFallback, !good);
      assert.equal(result.source, good ? "agnes" : "server-fallback");
    } finally {
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    }
  }
});

test("Agnes request cancellation is bounded", async () => {
  const client = createAgnesClient({
    apiKey: "test-secret",
    fetchImpl: async (_url, init) =>
      new Promise((_resolve, reject) =>
        init!.signal!.addEventListener(
          "abort",
          () => reject(new Error("aborted")),
          { once: true },
        ),
      ),
  });
  await assert.rejects(() =>
    client.models.generateContent({
      model: "agnes-3.0-flash",
      contents: "test",
      config: { httpOptions: { timeout: 5 } },
    }),
  );
});
test("Agnes source survives saved data and backup validation", async () => {
  const { emptyData, parseBackup } = await import("../src/utils/validation.ts");
  const data = emptyData();
  data.entries = [
    {
      id: "agnes-test",
      date: "2026-11-01",
      state: "good",
      tags: [],
      factors: [],
      createdAt: "2026-11-01T00:00:00Z",
      updatedAt: "2026-11-01T00:00:00Z",
      aiSource: "agnes",
      aiCoached: true,
    },
  ];
  assert.deepEqual(
    parseBackup(JSON.stringify({ version: "1.0", ...data })),
    data,
  );
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { assessStrategy, reportStrategy } from "../src/utils/evolution.ts";
import { emptyData, isPersonalOS } from "../src/utils/validation.ts";
test("three failures pause, correction restores previous active state, one report per date", () => {
  let s: any = { id: "s", ifText: "x", thenText: "y", active: true };
  for (const date of ["2026-10-29", "2026-10-30", "2026-10-31"])
    s = reportStrategy(s, date, "unhelpful");
  assert.equal(s.active, false);
  assert.equal(assessStrategy(s), "paused");
  assert.equal(s.decisions.length, 1);
  s = reportStrategy(s, "2026-10-31", "helpful");
  assert.equal(s.active, true);
  assert.equal(s.observations.length, 3);
  assert.equal(s.decisions.length, 2);
});
test("skips do not count and successful evidence validates", () => {
  let s: any = { id: "s", ifText: "x", thenText: "y", active: true };
  s = reportStrategy(s, "2026-10-28", "skipped");
  assert.equal(assessStrategy(s), "observing");
  for (const date of ["2026-10-29", "2026-10-30", "2026-10-31"])
    s = reportStrategy(s, date, "helpful");
  assert.equal(assessStrategy(s), "validated");
  assert.equal(s.active, true);
  const os = emptyData().personalOS;
  os.ifThenStrategies = [s];
  assert.ok(isPersonalOS(JSON.parse(JSON.stringify(os))));
  s.observations[0].outcome = "invalid";
  assert.equal(isPersonalOS(os), false);
});

test("backup round trip preserves observations and decisions", async () => {
  const { parseBackup } = await import("../src/utils/validation.ts");
  const os = emptyData().personalOS;
  let s: any = { id: "s", ifText: "x", thenText: "y", active: false };
  for (const date of ["2026-10-29", "2026-10-30", "2026-10-31"])
    s = reportStrategy(s, date, "unhelpful");
  s = reportStrategy(s, "2026-10-31", "helpful");
  assert.equal(s.active, false);
  os.ifThenStrategies = [s];
  const data = { entries: [], personalOS: os };
  assert.deepEqual(
    parseBackup(JSON.stringify({ version: "1.0", ...data })),
    data,
  );
});
test("architecture has unique nodes, exclusive layers and resolvable paths", async () => {
  const { ARCHIFY_SPEC, LOOP_STEPS } =
    await import("../src/utils/architecture.ts");
  const ids = new Set(ARCHIFY_SPEC.nodes.map((n) => n.id));
  assert.equal(ids.size, ARCHIFY_SPEC.nodes.length);
  for (const node of ARCHIFY_SPEC.nodes)
    assert.equal(
      ARCHIFY_SPEC.layers.filter((l) => l.id === node.layer).length,
      1,
    );
  for (const edge of ARCHIFY_SPEC.edges) {
    assert.ok(ids.has(edge.source));
    assert.ok(ids.has(edge.target));
  }
  for (const step of LOOP_STEPS) assert.ok(ids.has(step.node));
});


test("knowledge graph HTML files contain valid JSON data and connected topologies", async () => {
  const { readFileSync, existsSync } = await import("node:fs");
  const path = await import("node:path");
  for (const rel of ["public/knowledge-graph.html", "Live-A-Better-Life.html"]) {
    const file = path.resolve(rel);
    if (!existsSync(file)) continue;
    const content = readFileSync(file, "utf8");
    for (const tagId of ["data-nodes", "data-categories"]) {
      const startTag = `<script id="${tagId}" type="application/json">`;
      const startIdx = content.indexOf(startTag);
      assert.ok(startIdx !== -1, `${rel} missing ${tagId}`);
      const jsonStart = startIdx + startTag.length;
      const endIdx = content.indexOf("</script>", jsonStart);
      assert.ok(endIdx !== -1, `${rel} unclosed ${tagId}`);
      const parsed = JSON.parse(content.slice(jsonStart, endIdx).trim());
      assert.ok(parsed, `${rel} ${tagId} failed to parse`);
      if (tagId === "data-nodes") {
        const nodeIds = new Set(parsed.map((n: any) => n.id));
        for (const node of parsed) {
          if (Array.isArray(node.connections)) {
            for (const conn of node.connections) {
              assert.ok(nodeIds.has(conn), `${rel} connection ${conn} in node ${node.id} not found in nodes`);
            }
          }
        }
      }
    }
  }
});

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

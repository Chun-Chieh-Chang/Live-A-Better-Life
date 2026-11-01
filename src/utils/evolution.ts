import type { IfThenStrategy, StrategyOutcome } from "../types";
import { isDate } from "./validation";
export const EVOLUTION_POLICY = {
  sampleSize: 3,
  description:
    "最近三次已執行回報皆有效 → 已驗證；皆無效 → 自動暫停；未執行不列入判定。",
} as const;
export function assessStrategy(
  s: IfThenStrategy,
): "observing" | "validated" | "paused" {
  const reports = [...(s.observations || [])]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((r) => r.outcome !== "skipped")
    .slice(0, EVOLUTION_POLICY.sampleSize);
  if (reports.length < EVOLUTION_POLICY.sampleSize) return "observing";
  if (reports.every((r) => r.outcome === "helpful")) return "validated";
  if (reports.every((r) => r.outcome === "unhelpful")) return "paused";
  return "observing";
}
export function reportStrategy(
  s: IfThenStrategy,
  date: string,
  outcome: StrategyOutcome,
): IfThenStrategy {
  if (!isDate(date) || !["helpful", "unhelpful", "skipped"].includes(outcome))
    throw new Error("Invalid observation");
  const previous = assessStrategy(s);
  const next = {
    ...s,
    observations: [
      ...(s.observations || []).filter((r) => r.date !== date),
      { date, outcome },
    ].sort((a, b) => a.date.localeCompare(b.date)),
  };
  const status = assessStrategy(next);
  if (status === "paused" && !s.autoPaused) {
    next.activeBeforePause = s.active;
    next.active = false;
    next.autoPaused = true;
  } else if (status !== "paused" && s.autoPaused) {
    next.active = s.activeBeforePause ?? true;
    next.autoPaused = false;
    delete next.activeBeforePause;
  }
  if (previous !== status)
    next.decisions = [
      ...(s.decisions || []),
      {
        at: new Date().toISOString(),
        status,
        reason: EVOLUTION_POLICY.description,
      },
    ];
  return next;
}

import type { DailyEntry, DayState, PersonalOS } from "../types";
const record = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown): v is string =>
  typeof v === "string" && v.length <= 50000;
const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.length <= 1000 && v.every(text);
export const isDayState = (v: unknown): v is DayState =>
  ["good", "bad", "normal"].includes(v as string);
export function isDate(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !Number.isNaN(Date.parse(v)) &&
    new Date(v).toISOString().slice(0, 10) === v
  );
}
export function isCoachResult(
  v: unknown,
): v is NonNullable<DailyEntry["aiAdvice"]> {
  return (
    record(v) &&
    strings(v.strategies) &&
    v.strategies.length >= 1 &&
    v.strategies.length <= 5 &&
    v.strategies.every((s) => s.trim()) &&
    text(v.psychologicalInsight) &&
    !!v.psychologicalInsight.trim() &&
    ["suggestedTag", "encouragement"].every(
      (k) => v[k] === undefined || text(v[k]),
    )
  );
}
const rows = (v: unknown, check: (r: Record<string, any>) => boolean) =>
  Array.isArray(v) &&
  v.length <= 10000 &&
  v.every((r) => record(r) && text(r.id) && !!r.id && check(r)) &&
  new Set(v.map((r) => r.id)).size === v.length;
export function isPersonalOS(v: unknown): v is PersonalOS {
  return (
    record(v) &&
    rows(
      v.ifThenStrategies,
      (r) =>
        text(r.ifText) &&
        text(r.thenText) &&
        typeof r.active === "boolean" &&
        (r.category === undefined ||
          ["work", "health", "emotion", "life"].includes(r.category)) &&
        (r.sourceDate === undefined || isDate(r.sourceDate)),
    ) &&
    rows(
      v.habitQuestions,
      (r) => text(r.text) && typeof r.active === "boolean",
    ) &&
    rows(
      v.emergencyRecipes,
      (r) => text(r.title) && text(r.description) && text(r.tag),
    ) &&
    rows(
      v.avoidanceGuides,
      (r) => text(r.title) && text(r.lesson) && text(r.tag),
    )
  );
}
export const coachFields = [
  "goodWhere",
  "goodKeep",
  "badFact",
  "badEmotion",
  "badReason",
  "badImprove",
  "normalMoment",
  "normalAmplify",
  "tags",
  "factors",
] as const;
export function isCoachRequest(v: unknown): boolean {
  return (
    record(v) &&
    isDayState(v.state) &&
    record(v.data) &&
    coachFields.every((k) => v.data[k] === undefined || text(v.data[k])) &&
    (v.personalOS === undefined || isPersonalOS(v.personalOS)) &&
    (v.customPrompt === undefined || text(v.customPrompt))
  );
}
export function isDailyEntry(v: unknown): v is DailyEntry {
  return (
    record(v) &&
    text(v.id) &&
    !!v.id &&
    isDate(v.date) &&
    isDayState(v.state) &&
    strings(v.tags) &&
    strings(v.factors) &&
    coachFields
      .filter((k) => k !== "tags" && k !== "factors")
      .every((k) => v[k] === undefined || text(v[k])) &&
    text(v.createdAt) &&
    Number.isFinite(Date.parse(v.createdAt)) &&
    text(v.updatedAt) &&
    Number.isFinite(Date.parse(v.updatedAt)) &&
    (v.aiCoached === undefined || typeof v.aiCoached === "boolean") &&
    (v.aiAdvice === undefined || isCoachResult(v.aiAdvice)) &&
    (v.aiSource === undefined ||
      ["gemini", "server-fallback", "local-fallback", "unknown"].includes(
        v.aiSource,
      ))
  );
}
export interface LifeData {
  draftScope?: string;
  entries: DailyEntry[];
  personalOS: PersonalOS;
}
export const emptyData = (): LifeData => ({
  entries: [],
  personalOS: {
    ifThenStrategies: [],
    habitQuestions: [],
    emergencyRecipes: [],
    avoidanceGuides: [],
  },
});
export function isLifeData(v: unknown): v is LifeData {
  return (
    record(v) &&
    (v.draftScope === undefined ||
      (typeof v.draftScope === "string" &&
        /^[a-zA-Z0-9-]{1,80}$/.test(v.draftScope))) &&
    Array.isArray(v.entries) &&
    v.entries.length <= 10000 &&
    v.entries.every(isDailyEntry) &&
    new Set(v.entries.map((e) => e.date)).size === v.entries.length &&
    new Set(v.entries.map((e) => e.id)).size === v.entries.length &&
    isPersonalOS(v.personalOS)
  );
}
export function parseBackup(raw: string): LifeData {
  const v = JSON.parse(raw);
  if (!record(v) || v.version !== "1.0" || !isLifeData(v))
    throw new Error("備份格式、日期或欄位不正確（支援版本 1.0，日期不可重複）");
  return { entries: v.entries, personalOS: v.personalOS };
}
export const todayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

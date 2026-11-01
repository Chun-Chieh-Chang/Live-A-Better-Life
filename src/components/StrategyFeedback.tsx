import React, { useState } from "react";
import type { PersonalOS, StrategyOutcome } from "../types";
import {
  assessStrategy,
  reportStrategy,
  EVOLUTION_POLICY,
} from "../utils/evolution";
const labels = {
  observing: "再試試看",
  validated: "對你有幫助",
  paused: "先休息一下",
};
export function StrategyFeedback({
  os,
  date,
  onSave,
}: {
  os: PersonalOS;
  date: string;
  onSave: (os: PersonalOS) => boolean;
}) {
  const [message, setMessage] = useState("");
  if (!os.ifThenStrategies.length) return null;
  return (
    <section
      aria-label="方法的嘗試結果"
      className="rounded-2xl border border-[#c8d8c3] p-4 mb-6 bg-white/60 text-sm space-y-3"
    >
      <h2 className="font-bold text-lg">這個方法有幫助嗎？</h2>
      <p>
        照實記下嘗試結果。連續三次都沒幫助的方法，會先暫停提醒；沒有嘗試不算沒幫助。
      </p>
      <p>
        回報日期：{date}
        （和記錄日期相同，可重新選擇答案）。
      </p>
      {!os.ifThenStrategies.length && (
        <p>先從教練建議加入手冊，或在個人操作手冊新增策略。</p>
      )}
      {os.ifThenStrategies.map((s) => (
        <article
          key={s.id}
          className="border rounded-xl p-3 space-y-2 break-words"
        >
          <h3 className="font-bold">
            當 {s.ifText}，就 {s.thenText}
          </h3>
          <p>
            {labels[assessStrategy(s)]} · {s.active ? "每天提醒" : "暫不提醒"} ·
            已記錄 {s.observations?.length || 0} 天
          </p>
          <div className="flex flex-wrap gap-2">
            {(["helpful", "unhelpful", "skipped"] as StrategyOutcome[]).map(
              (outcome, i) => (
                <button
                  key={outcome}
                  aria-pressed={
                    s.observations?.find((o) => o.date === date)?.outcome ===
                    outcome
                  }
                  className="min-h-11 px-3 border rounded-lg aria-pressed:bg-[#dcead9]"
                  onClick={() => {
                    const next = {
                      ...os,
                      ifThenStrategies: os.ifThenStrategies.map((row) =>
                        row.id === s.id
                          ? reportStrategy(row, date, outcome)
                          : row,
                      ),
                    };
                    setMessage(
                      onSave(next)
                        ? "已記下，會依你的感受調整提醒。"
                        : "保存失敗，回報未套用。",
                    );
                  }}
                >
                  {["試過，有幫助", "試過，沒幫助", "還沒試"][i]}
                </button>
              ),
            )}
          </div>
          <details>
            <summary className="min-h-11 py-3 cursor-pointer">
              調整紀錄（{s.decisions?.length || 0}）
            </summary>
            {s.decisions?.map((d, i) => (
              <p key={i}>
                {new Date(d.at).toLocaleDateString("zh-TW")} ·{" "}
                {labels[d.status]}
              </p>
            ))}
          </details>
        </article>
      ))}
      <p role="status">{message}</p>
    </section>
  );
}

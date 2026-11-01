import React, { useState } from "react";
import type { DailyEntry, PersonalOS } from "../types";
import { parseBackup } from "../utils/validation";
import { RECOVERY_KEY } from "../utils/storage";
import {
  downloadFile,
  generateDailyNoteMarkdown,
  generatePersonalOSMarkdown,
} from "../utils/markdownExporter";
interface Props {
  storage?: Storage;
  entries: DailyEntry[];
  personalOS: PersonalOS;
  onImportData: (entries: DailyEntry[], os: PersonalOS) => boolean;
}
export const ObsidianExportTab: React.FC<Props> = ({
  storage = localStorage,
  entries,
  personalOS,
  onImportData,
}) => {
  const [status, setStatus] = useState("");
  const backup = () =>
    downloadFile(
      "把日子過好-備份.json",
      JSON.stringify(
        {
          version: "1.0",
          exportedAt: new Date().toISOString(),
          entries,
          personalOS,
        },
        null,
        2,
      ),
      "application/json",
    );
  const restore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = parseBackup(await file.text());
      if (
        !window.confirm(
          "將用這份備份取代目前的記錄與小改變。尚未儲存的內容不會帶入，請先儲存或下載。確定還原？",
        )
      ) {
        setStatus("已取消，資料未變更");
        return;
      }
      if (!onImportData(data.entries, data.personalOS)) throw new Error();
      setStatus("已還原你的記錄。");
    } catch {
      setStatus(
        "無法還原，請確認選擇的是本工具下載的完整備份。原有資料未被取代。",
      );
    }
  };
  return (
    <section className="space-y-6 pb-10 text-sm">
      <header>
        <h1 className="text-2xl font-bold">把記錄留在自己手邊</h1>
        <p className="mt-2 text-[#616c62]">
          換電腦或清除瀏覽器前，先下載一份完整備份。
        </p>
      </header>
      <div className="border border-[#e8e5d8] rounded-xl bg-white/60 p-5 space-y-3">
        <h2 className="font-bold text-lg">備份你的記錄</h2>
        <p>
          包含 {entries.length}{" "}
          篇記錄、我的小改變與嘗試結果。正在編輯但還沒儲存的內容不包含在內。
        </p>
        <button
          className="min-h-11 px-5 rounded-xl bg-[#4d6b53] text-white"
          onClick={backup}
        >
          下載完整備份
        </button>
      </div>
      <div className="border border-[#e8e5d8] rounded-xl bg-white/60 p-5 space-y-3">
        <h2 className="font-bold text-lg">從備份找回記錄</h2>
        <p>
          選擇之前下載的備份檔。還原會取代目前內容，我們會先保留一份取代前的備份。
        </p>
        <label className="inline-flex items-center min-h-11 px-5 border rounded-xl cursor-pointer focus-within:ring-2 focus-within:ring-[#4d6b53]">
          選擇備份檔
          <input
            aria-label="選擇備份檔"
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={restore}
          />
        </label>
      </div>
      <p role="status">{status}</p>
      <details className="border-t border-[#e8e5d8] pt-3">
        <summary className="min-h-11 py-3 cursor-pointer">其他下載方式</summary>
        <div className="space-y-3 py-3">
          <button
            className="min-h-11 border rounded-xl px-4"
            onClick={() => {
              const raw = storage.getItem(RECOVERY_KEY);
              if (!raw) {
                setStatus("目前沒有取代前的備份。");
                return;
              }
              downloadFile("取代前的備份.json", raw, "application/json");
            }}
          >
            下載取代前的備份
          </button>
          <p>
            如果你使用其他筆記工具，也可以下載可閱讀的文字筆記。文字筆記不能用來完整還原。
          </p>
          <button
            className="min-h-11 border rounded-xl px-4"
            onClick={() =>
              downloadFile(
                "我的生活筆記.md",
                [
                  generatePersonalOSMarkdown(personalOS),
                  ...entries.map((e) =>
                    generateDailyNoteMarkdown(e, personalOS),
                  ),
                ].join("\n\n---\n\n"),
                "text/markdown",
              )
            }
          >
            下載文字筆記
          </button>
        </div>
      </details>
    </section>
  );
};

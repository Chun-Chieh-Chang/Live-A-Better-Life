import React, { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";
import { isLifeData, type LifeData } from "../utils/validation";
import { loadData } from "../utils/storage";
import { downloadFile } from "../utils/markdownExporter";

interface Snapshot {
  revision: number;
  data: LifeData;
}
export function CloudSyncPanel({
  data,
  onReplace,
  onLogout,
}: {
  data: LifeData;
  onReplace: (data: LifeData) => boolean;
  onLogout: () => Promise<void>;
}) {
  const [remote, setRemote] = useState<Snapshot | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [backups, setBackups] = useState<
    { revision: number; created: string }[]
  >([]);
  const snapshot = (d: LifeData) => ({
    entries: d.entries,
    personalOS: d.personalOS,
  });
  const request = async (url: string, init?: RequestInit) => {
    const r = await apiFetch(url, init);
    const j = await r.json();
    if (!r.ok)
      throw new Error(
        r.status === 401
          ? "登入已過期，請先下載本機備份後重新登入。"
          : r.status === 409
            ? "其他裝置已更新資料。此次操作未覆蓋伺服器；請重新整理版本後下載並比較。"
            : j.error || "操作失敗，請重試。",
      );
    return j;
  };
  const getRemote = async () => {
    const j = await request("/api/data");
    if (!Number.isSafeInteger(j.revision) || !isLifeData(j.data))
      throw new Error("伺服器資料格式異常");
    return j as Snapshot;
  };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "操作失敗");
    } finally {
      setBusy(false);
    }
  };
  const refresh = async () => {
    setRemote(await getRemote());
    const j = await request("/api/backups");
    setBackups(j.backups);
  };
  useEffect(() => {
    void run(refresh);
  }, []);
  const upload = () =>
    run(async () => {
      if (!remote) return;
      if (
        !window.confirm(
          "將以上傳的本機已歸檔日誌與手冊取代伺服器版本。未歸檔草稿不會上傳。確定？",
        )
      )
        return;
      const j = await request("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedRevision: remote.revision,
          data: snapshot(data),
        }),
      });
      setRemote(j);
      setMessage("已上傳至伺服器。");
      const b = await request("/api/backups");
      setBackups(b.backups);
    });
  const download = () =>
    run(async () => {
      const latest = await getRemote();
      if (
        !window.confirm(
          `下載伺服器版本 ${latest.revision}（${latest.data.entries.length} 篇日誌）並取代此裝置已保存資料？會先保留本機覆蓋前備份；未歸檔草稿不會套用。`,
        )
      )
        return;
      if (!onReplace(latest.data))
        throw new Error("本機保存失敗，未取代資料。");
      setRemote(latest);
      setMessage("已下載伺服器版本至此裝置。");
    });
  return (
    <section
      className="max-w-6xl mx-auto p-4 space-y-2 border rounded"
      aria-label="個人多裝置同步"
    >
      <div className="flex justify-between">
        <strong>個人多裝置 · 手動同步</strong>
        <button onClick={() => void onLogout()}>登出</button>
      </div>
      <p>
        目前裝置使用分頁暫存；關閉分頁前請上傳或下載備份。儲存日誌不會自動上傳。草稿不會同步。
      </p>
      <p>
        {remote
          ? `伺服器版本 ${remote.revision} · ${JSON.stringify(snapshot(data)) === JSON.stringify(snapshot(remote.data)) ? "已與伺服器一致" : "本機與伺服器內容不同"}`
          : "尚未取得伺服器版本"}
      </p>
      <div className="flex gap-4 flex-wrap">
        <button disabled={busy} onClick={() => void run(refresh)}>
          重新整理伺服器版本
        </button>
        <button disabled={busy || !remote} onClick={() => void upload()}>
          上傳已歸檔資料
        </button>
        <button disabled={busy} onClick={() => void download()}>
          下載伺服器資料
        </button>
        <button
          disabled={busy}
          onClick={() =>
            void run(async () => {
              downloadFile(
                "life-os-server.json",
                JSON.stringify(
                  { version: "1.0", ...snapshot((await getRemote()).data) },
                  null,
                  2,
                ),
                "application/json",
              );
            })
          }
        >
          下載伺服器備份
        </button>
        <button
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const local = loadData(localStorage);
              if (
                !window.confirm(
                  `匯入原本機工作區的 ${local.entries.length} 篇日誌？目前分頁資料會被取代，伺服器不會自動更新。`,
                )
              )
                return;
              if (!onReplace(local)) throw new Error("本機匯入失敗");
              setMessage("已匯入原本機資料，確認後可上傳。");
            })
          }
        >
          匯入原本機工作區
        </button>
      </div>
      <details>
        <summary>伺服器歷史備份（最近 30 次寫入前版本）</summary>
        {backups.map((b) => (
          <div key={b.revision}>
            版本 {b.revision} · {b.created}{" "}
            <button
              disabled={busy || !remote}
              onClick={() =>
                void run(async () => {
                  if (
                    !window.confirm(
                      `還原伺服器到歷史版本 ${b.revision}？此操作會建立新版本，本機暫存不會自動改變。`,
                    )
                  )
                    return;
                  const restored = await request("/api/data/restore", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      backupRevision: b.revision,
                      expectedRevision: remote!.revision,
                    }),
                  });
                  setRemote(restored);
                  setMessage("伺服器已還原；請下載伺服器資料更新此裝置。");
                  const list = await request("/api/backups");
                  setBackups(list.backups);
                })
              }
            >
              還原此伺服器版本
            </button>
          </div>
        ))}
      </details>
      {message && <p role="status">{message}</p>}
    </section>
  );
}

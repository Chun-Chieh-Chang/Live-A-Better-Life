import React, { useEffect, useState, useRef } from "react";
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
  const [blocked, setBlocked] = useState(false);
  const [notes, setNotes] = useState<any>(null);
  const [notesPath, setNotesPath] = useState("");
  useEffect(() => {
    if (notes?.directory) setNotesPath(notes.directory);
  }, [notes?.directory]);
  const lastSavedHash = useRef("");
  const hash = (d: LifeData) =>
    JSON.stringify({ entries: d.entries, personalOS: d.personalOS });
  const acceptRemote = (saved: any) => {
    lastSavedHash.current = hash(saved.data);
    setRemote(saved);
    setBlocked(false);
    if (saved.obsidian) setNotes(saved.obsidian);
  };
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
            ? "其他裝置已更新資料。此次操作未覆蓋個人空間；請重新整理版本後下載並比較。"
            : j.error || "操作失敗，請重試。",
      );
    return j;
  };
  const getRemote = async () => {
    const j = await request("/api/data");
    if (!Number.isSafeInteger(j.revision) || !isLifeData(j.data))
      throw new Error("個人空間資料格式異常");
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
    const saved = await getRemote();
    lastSavedHash.current = hash(saved.data);
    setBlocked(hash(data) !== hash(saved.data));
    setRemote(saved);
    const noteResponse = await apiFetch("/api/obsidian");
    if (noteResponse.ok) setNotes(await noteResponse.json());
    const j = await request("/api/backups");
    setBackups(j.backups);
  };
  useEffect(() => {
    void run(refresh);
  }, []);
  useEffect(() => {
    if (!remote || busy || blocked || hash(data) === lastSavedHash.current)
      return;
    const timer = setTimeout(() => {
      void run(async () => {
        try {
          const saved = await request("/api/data", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              expectedRevision: remote.revision,
              data: snapshot(data),
            }),
          });
          acceptRemote(saved);
          setMessage("已自動存到個人空間。");
        } catch (error) {
          setBlocked(true);
          throw error;
        }
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [data, remote?.revision, busy, blocked]);
  const pendingSave = !!remote && hash(data) !== lastSavedHash.current;
  useEffect(() => {
    if (!pendingSave) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pendingSave]);
  const upload = () =>
    run(async () => {
      if (!remote) return;
      if (
        !window.confirm(
          "將以上傳的本機已儲存日誌與手冊取代個人空間版本。未儲存草稿不會上傳。確定？",
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
      acceptRemote(j);
      setMessage("已上傳至個人空間。");
      const b = await request("/api/backups");
      setBackups(b.backups);
    });
  const download = () =>
    run(async () => {
      const latest = await getRemote();
      if (
        !window.confirm(
          `下載個人空間版本 ${latest.revision}（${latest.data.entries.length} 篇日誌）並取代此裝置已保存資料？會先保留本機覆蓋前備份；未儲存草稿不會套用。`,
        )
      )
        return;
      if (!onReplace(latest.data))
        throw new Error("本機保存失敗，未取代資料。");
      acceptRemote(latest);
      setMessage("已下載個人空間版本至此裝置。");
    });
  return (
    <section
      className="max-w-6xl w-full mx-auto p-4 space-y-3 border border-[#e8e5d8] rounded-xl text-sm [&_button]:min-h-11 [&_button]:px-3 [&_button]:border [&_button]:rounded-lg"
      aria-label="個人多裝置同步"
    >
      <div className="flex justify-between">
        <strong>個人空間</strong>
        <button onClick={() => void onLogout()}>登出</button>
      </div>
      <p>
        按「儲存」後會自動存到個人空間，並更新筆記資料夾。還在編輯的草稿不會自動送出。
      </p>
      <p>
        {remote
          ? `${JSON.stringify(snapshot(data)) === JSON.stringify(snapshot(remote.data)) ? "已保存到個人空間" : "這裡和個人空間的內容不同，請選擇保存或取回"}`
          : "正在讀取個人空間…"}
      </p>
      {pendingSave && !blocked && (
        <p role="status">正在自動保存，請稍候再關閉頁面。</p>
      )}
      {blocked && (
        <p role="alert">
          有內容尚未保存到個人空間。請先檢查最新記錄，再選擇保存或取回，避免覆蓋其他裝置的修改。
        </p>
      )}
      {notes?.status === "saved" && (
        <p>
          筆記資料夾已更新。
          {notes.openUrl && (
            <a
              className="inline-flex items-center min-h-11 px-3 underline"
              href={notes.openUrl}
            >
              在 Obsidian 開啟
            </a>
          )}
        </p>
      )}
      {notes?.directory && (
        <div className="space-y-2">
          <p className="break-all">
            <span className="font-medium">筆記存放位置：</span>
            {notes.directory}
          </p>
          <details>
            <summary className="min-h-11 py-3 cursor-pointer">
              變更筆記位置
            </summary>
            <div className="space-y-3 pb-3">
              <p>
                目前的記錄會先保存到新位置，成功後才切換。舊資料夾會保留。若
                Obsidian 開著，請先關閉再套用新位置。
              </p>
              <label className="block" htmlFor="notes-folder">
                資料夾路徑
              </label>
              <input
                id="notes-folder"
                className="w-full min-h-11 border rounded-lg px-3 bg-white"
                value={notesPath}
                onChange={(event) => setNotesPath(event.target.value)}
                disabled={busy}
              />
              <div className="flex flex-wrap gap-3">
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const selected = await request(
                        "/api/obsidian/choose-folder",
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            path: notesPath || notes.directory,
                          }),
                        },
                      );
                      if (selected.path) {
                        setNotesPath(selected.path);
                        setMessage("已選擇資料夾。確認後按「使用這個位置」。");
                      }
                    })
                  }
                >
                  選擇資料夾
                </button>
                <button
                  disabled={
                    busy || !notesPath.trim() || notesPath === notes.directory
                  }
                  onClick={() =>
                    void run(async () => {
                      const updated = await request("/api/obsidian/location", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ path: notesPath.trim() }),
                      });
                      setNotes(updated);
                      setMessage("筆記位置已更新，之後會自動保存到這裡。");
                    })
                  }
                >
                  使用這個位置
                </button>
              </div>

            </div>
          </details>
        </div>
      )}
      {notes?.status === "pending" && (
        <p role="alert">
          記錄已保存，但筆記資料夾尚未更新。
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const result = await request("/api/obsidian/retry", {
                  method: "POST",
                });
                setNotes(result);
              })
            }
          >
            重試更新筆記
          </button>
        </p>
      )}
      <div className="flex gap-4 flex-wrap">
        <button disabled={busy || !remote} onClick={() => void upload()}>
          存到個人空間
        </button>
        <button disabled={busy} onClick={() => void download()}>
          取回個人空間的記錄
        </button>
        <details className="w-full">
          <summary className="min-h-11 py-3 cursor-pointer">
            備份與其他選項
          </summary>
          <div className="flex flex-wrap gap-3">
            <button disabled={busy} onClick={() => void run(refresh)}>
              檢查最新記錄
            </button>{" "}
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
              下載個人空間備份
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const local = loadData(localStorage);
                  if (
                    !window.confirm(
                      `匯入這個瀏覽器的舊記錄的 ${local.entries.length} 篇日誌？目前分頁資料會被取代，個人空間不會自動更新。`,
                    )
                  )
                    return;
                  if (!onReplace(local)) throw new Error("本機匯入失敗");
                  setMessage("已匯入原本機資料，確認後可上傳。");
                })
              }
            >
              匯入這個瀏覽器的舊記錄
            </button>
          </div>
        </details>
      </div>
      <details>
        <summary>找回之前的記錄</summary>
        {backups.map((b) => (
          <div key={b.revision}>
            {new Date(b.created).toLocaleString("zh-TW")}{" "}
            <button
              disabled={busy || !remote}
              onClick={() =>
                void run(async () => {
                  if (
                    !window.confirm(
                      `還原個人空間到歷史版本 ${b.revision}？此操作會建立新版本，本機暫存不會自動改變。`,
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
                  acceptRemote(restored);
                  setBlocked(true);
                  setMessage(
                    "個人空間已還原；請取回個人空間的記錄更新此裝置。",
                  );
                  const list = await request("/api/backups");
                  setBackups(list.backups);
                })
              }
            >
              還原這份記錄
            </button>
          </div>
        ))}
      </details>
      {message && <p role="status">{message}</p>}
    </section>
  );
}

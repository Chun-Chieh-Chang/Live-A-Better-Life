import React, { useEffect, useState } from "react";
import App from "../App";
import { apiFetch } from "../utils/api";
import { DATA_KEY, saveData } from "../utils/storage";
import { isLifeData } from "../utils/validation";
import { PersonalStorage } from "../utils/personalStorage";

type Session = {
  mode: "local" | "personal";
  configured?: boolean;
  desktop?: boolean;
  authenticated: boolean;
  workspaceId?: string;
};
export default function PersonalWorkspace() {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const [launchRequested, setLaunchRequested] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [cache, setCache] = useState<Storage | null>(null);
  const load = async () => {
    try {
      const r = await apiFetch("/api/auth/session");
      if (r.status === 404) {
        // 純靜態託管環境（如 GitHub Pages），無後端 API，自動降級為純瀏覽器本地模式
        setSession({ mode: "local", authenticated: false });
        setError("");
        return;
      }
      if (!r.ok) throw new Error();
      const s = await r.json();
      if (!["local", "personal"].includes(s.mode)) throw new Error();
      if (s.mode === "personal" && s.authenticated) {
        if (typeof s.workspaceId !== "string") throw new Error();
        const nextCache = new PersonalStorage(
          sessionStorage,
          "life_os_personal_" + s.workspaceId + "_",
        );
        if (nextCache.getItem(DATA_KEY) === null) {
          const remote = await apiFetch("/api/data");
          if (!remote.ok) throw new Error();
          const saved = await remote.json();
          if (!isLifeData(saved.data)) throw new Error();
          saveData(nextCache, saved.data);
        }
        setCache(nextCache);
      }
      setSession(s);
      setError("");
    } catch {
      setError("無法確認服務狀態，請重試。");
    }
  };
  useEffect(() => {
    const handleLaunch = () => {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const grant = fragment.get("desktop");
      if (grant) {
        // Remove the short-lived credential before any subsequent navigation.
        history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
        void (async () => {
          try {
            const r = await apiFetch("/api/auth/desktop", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: grant }),
            });
            if (!r.ok) {
              await load();
              setError(
                "自動登入連結已過期或已使用，請再按一次「開啟我的日記」。",
              );
              return;
            }
            await load();
          } catch {
            setError("自動登入未完成，請再按一次「開啟我的日記」。");
          }
        })();
      } else void load();
    };
    handleLaunch();
    window.addEventListener("hashchange", handleLaunch);
    return () => window.removeEventListener("hashchange", handleLaunch);
  }, []);
  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      setPassword("");
      if (!r.ok) {
        setError(
          r.status === 429
            ? "登入嘗試過多，請稍後再試。"
            : "登入失敗，請確認密碼。",
        );
        return;
      }
      await load();
    } catch {
      setError("無法連線，請重試。");
    } finally {
      setBusy(false);
    }
  };
  const logout = async () => {
    try {
      const r = await apiFetch("/api/auth/logout", { method: "POST" });
      if (!r.ok && r.status !== 401) throw new Error();
      cache?.clear();
      // Clear in-memory drafts and input state as well as the tab's private cache.
      window.location.reload();
    } catch {
      setError("登出未完成，請保持頁面並重試。");
    }
  };
  const loginForm = (
    <form onSubmit={login} className="space-y-4">
      <label className="block">
        登入密碼
        <input
          type="password"
          autoComplete="current-password"
          required
          maxLength={256}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="block border rounded p-2 w-full"
        />
      </label>
      <button disabled={busy} className="border rounded p-2">
        {busy ? "登入中…" : "登入"}
      </button>
      <p>此為單一擁有者帳號。請勿共用密碼或在不信任的裝置登入。</p>
    </form>
  );
  if (session?.mode === "local") return <App />;
  if (session?.authenticated && cache)
    return (
      <>
        <p role="alert">{error}</p>
        <App
          storage={cache}
          personal={{ workspaceId: session.workspaceId!, onLogout: logout }}
        />
      </>
    );
  return (
    <main className="max-w-md mx-auto p-8 space-y-4">
      <h1 className="text-2xl font-bold">把日子過好</h1>
      {!session ? (
        <p>正在確認服務狀態…</p>
      ) : !session.configured ? (
        <p>此服務尚未完成帳號設定，請由擁有者完成部署設定後再登入。</p>
      ) : session.desktop ? (
        <div className="space-y-4">
          <p>開啟你的日記，留一點時間給自己。</p>
          <button
            type="button"
            className="w-full min-h-12 px-5 py-3 bg-[#4d6b53] text-white font-semibold rounded-xl"
            onClick={() => {
              setLaunchRequested(true);
              window.location.href = "lifeos://open";
            }}
          >
            開啟我的日記
          </button>
          <p className="text-sm text-[#616c62]">
            第一次使用時，瀏覽器可能會詢問是否允許開啟，請選擇允許。
          </p>
          {launchRequested && (
            <p role="status" className="text-sm">
              已要求檢查並準備日記。若缺少 Obsidian，會提醒並自動安裝及連接筆記。請允許瀏覽器開啟；完成後會開啟新頁面。
            </p>
          )}
          <details>
            <summary className="min-h-11 py-3 cursor-pointer">
              按了沒有反應？
            </summary>
            <p className="text-sm">
              請開啟安裝資料夾中的 Start-LifeOS 啟動檔，再回來試一次。
            </p>
          </details>
          <details>
            <summary>使用既有密碼登入（選用）</summary>
            {loginForm}
          </details>
        </div>
      ) : (
        loginForm
      )}
      {error && (
        <div role="alert" className="space-y-3 pt-2">
          <p className="text-sm text-red-700">{error}</p>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              className="min-h-11 px-3 border border-[#e8e5d8] rounded-xl text-sm"
              onClick={() => void load()}
            >
              重試連線
            </button>
            <button
              type="button"
              className="min-h-11 px-3 bg-[#4d6b53] text-white rounded-xl text-sm font-medium"
              onClick={() => {
                setSession({ mode: "local", authenticated: false });
                setError("");
              }}
            >
              使用純瀏覽器模式
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

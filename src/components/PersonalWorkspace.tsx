import React, { useEffect, useState } from "react";
import App from "../App";
import { apiFetch } from "../utils/api";
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
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [cache, setCache] = useState<Storage | null>(null);
  const load = async () => {
    try {
      const r = await apiFetch("/api/auth/session");
      if (!r.ok) throw new Error();
      const s = await r.json();
      if (!["local", "personal"].includes(s.mode)) throw new Error();
      if (s.mode === "personal" && s.authenticated) {
        if (typeof s.workspaceId !== "string") throw new Error();
        setCache(
          new PersonalStorage(
            sessionStorage,
            `life_os_personal_${s.workspaceId}_`,
          ),
        );
      }
      setSession(s);
      setError("");
    } catch {
      setError("無法確認服務狀態，請重試。");
    }
  };
  useEffect(() => {
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
            setError("自動登入連結已過期或已使用，請重新雙擊啟動檔。");
            return;
          }
          await load();
        } catch {
          setError("自動登入未完成，請重新雙擊啟動檔。");
        }
      })();
    } else void load();
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
      <h1 className="text-2xl font-bold">把日子過好 · 個人工作區</h1>
      {!session ? (
        <p>正在確認服務狀態…</p>
      ) : !session.configured ? (
        <p>此服務尚未完成帳號設定，請由擁有者完成部署設定後再登入。</p>
      ) : session.desktop ? (
        <div className="space-y-4">
          <p>
            請雙擊專案中的 <strong>Start-LifeOS.cmd</strong>{" "}
            自動啟用並登入，不需要輸入密碼。
          </p>
          <details>
            <summary>使用既有密碼登入（選用）</summary>
            {loginForm}
          </details>
        </div>
      ) : (
        loginForm
      )}
      {error && (
        <div role="alert">
          {error}
          <button onClick={() => void load()}>重試連線</button>
        </div>
      )}
    </main>
  );
}

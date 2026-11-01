import type { Express, Request, Response, NextFunction } from "express";
import {
  PersonalStore,
  ConflictError,
  QuotaError,
  digest,
} from "./personal-store.ts";
import { isLifeData } from "../src/utils/validation.ts";

export interface PersonalConfig {
  store: PersonalStore;
  origin: string;
  desktop?: boolean;
  aiHourly?: number;
  aiDaily?: number;
}
export function validateOrigin(origin: string) {
  const url = new URL(origin);
  if (
    url.origin !== origin ||
    url.username ||
    url.password ||
    (url.protocol !== "https:" &&
      !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
  )
    throw new Error(
      "LIFE_OS_ORIGIN requires an HTTPS origin (HTTP allowed only for loopback tests)",
    );
  return origin;
}
const token = (req: Request) =>
  (req.headers.cookie || "")
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith("life_os_session="))
    ?.slice("life_os_session=".length) || "";
export function mountPersonal(app: Express, config: PersonalConfig) {
  const { store } = config;
  const origin = validateOrigin(config.origin);
  const secure = origin.startsWith("https:");
  if (config.desktop && !/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin))
    throw new Error("Desktop launch is loopback-only");
  const cookie = (res: Response, value: string, expire = false) =>
    res.cookie("life_os_session", value, {
      httpOnly: true,
      secure,
      sameSite: "strict",
      path: "/",
      maxAge: expire ? 0 : 8 * 60 * 60 * 1000,
    });
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.get("/api/auth/session", (req, res) =>
    res.json({
      mode: "personal",
      desktop: config.desktop === true,
      configured: store.configured(),
      authenticated: store.session(token(req)),
      ...(store.session(token(req)) ? { workspaceId: store.workspaceId } : {}),
    }),
  );
  // Custom header and exact Origin protect every mutation, including login, from cross-site requests.
  app.use("/api", (req, res, next) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      (req.get("origin") !== origin ||
        req.get("x-requested-with") !== "life-os")
    )
      return res
        .status(403)
        .json({ success: false, error: "Untrusted request origin" });
    next();
  });
  app.post("/api/auth/desktop", (req, res) => {
    if (!config.desktop) return res.status(404).json({ success: false });
    if (
      !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
        req.socket.remoteAddress || "",
      )
    )
      return res.status(403).json({ success: false });
    const session = store.redeemDesktopGrant(req.body?.token);
    if (!session)
      return res
        .status(401)
        .json({ success: false, error: "Launch link expired or already used" });
    cookie(res, session);
    return res.json({ success: true });
  });
  app.post("/api/auth/login", async (req, res, next) => {
    if (!store.configured())
      return res
        .status(503)
        .json({ success: false, error: "Owner setup required" });
    if (
      typeof req.body?.password !== "string" ||
      req.body.password.length > 256
    )
      return res
        .status(400)
        .json({ success: false, error: "Invalid login request" });
    try {
      store.consume([
        {
          key: `login:${digest(req.socket.remoteAddress || "unknown")}`,
          max: 5,
          windowMs: 15 * 60 * 1000,
        },
      ]);
    } catch {
      return res.status(429).json({
        success: false,
        error: "Too many login attempts",
        retryAfter: 900,
      });
    }
    try {
      if (!(await store.checkPassword(req.body.password)))
        return res
          .status(401)
          .json({ success: false, error: "Invalid credentials" });
      cookie(res, store.newSession());
      return res.json({ success: true, workspaceId: store.workspaceId });
    } catch (error) {
      next(error);
    }
  });
  app.use("/api", (req, res, next) => {
    if (!store.session(token(req)))
      return res.status(401).json({ success: false, error: "Login required" });
    next();
  });
  app.post("/api/auth/logout", (req, res) => {
    store.logout(token(req));
    cookie(res, "", true);
    res.json({ success: true });
  });
  app.get("/api/data", (_req, res) => res.json(store.read()));
  app.put("/api/data", (req, res) => {
    if (
      !isLifeData(req.body?.data) ||
      !Number.isSafeInteger(req.body?.expectedRevision) ||
      req.body.expectedRevision < 0
    )
      return res.status(400).json({ success: false, error: "Invalid data" });
    try {
      return res.json(store.write(req.body.data, req.body.expectedRevision));
    } catch (error) {
      if (error instanceof ConflictError)
        return res.status(409).json({
          success: false,
          error: "資料已在其他裝置更新，請先下載並比較，未覆蓋伺服器資料。",
        });
      throw error;
    }
  });
  app.get("/api/backups", (_req, res) =>
    res.json({ backups: store.backups() }),
  );
  app.get("/api/backups/:revision", (req, res) => {
    if (!/^\d+$/.test(req.params.revision))
      return res.status(400).json({ success: false });
    const data = store.backup(Number(req.params.revision));
    if (!data) return res.status(404).json({ success: false });
    res
      .attachment(`life-os-backup-${req.params.revision}.json`)
      .json({ version: "1.0", ...data });
  });
  app.post("/api/data/restore", (req, res) => {
    if (
      !Number.isSafeInteger(req.body?.backupRevision) ||
      !Number.isSafeInteger(req.body?.expectedRevision) ||
      req.body.expectedRevision < 0 ||
      req.body.backupRevision < 0
    )
      return res.status(400).json({ success: false });
    const data = store.backup(req.body.backupRevision);
    if (!data) return res.status(404).json({ success: false });
    try {
      return res.json(store.write(data, req.body.expectedRevision));
    } catch (error) {
      if (error instanceof ConflictError)
        return res
          .status(409)
          .json({ success: false, error: "資料版本已變更，未還原。" });
      throw error;
    }
  });
  return () =>
    store.consume([
      { key: "ai-hour", max: config.aiHourly ?? 20, windowMs: 3600000 },
      { key: "ai-day", max: config.aiDaily ?? 100, windowMs: 86400000 },
    ]);
}

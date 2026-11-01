import {applyNoteChange,type ObsidianMirror} from './obsidian.ts';
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
  obsidian?: ObsidianMirror;
  chooseNotesFolder?: (initialPath:string)=>Promise<{path:string|null}>;
  changeNotesFolder?: (root:string)=>Promise<ObsidianMirror>;
  aiHourly?: number;
  aiDaily?: number;
  shutdown?: () => Promise<void>;
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
  let notesStatus:any={status:'not-configured'};
  const syncNotes=()=>{if(!config.obsidian)return notesStatus;try{const saved=store.read();notesStatus=config.obsidian.sync(saved.data,saved.revision);}catch{notesStatus={status:'pending',directory:config.obsidian?.root,message:'記錄已保存，但筆記資料夾尚未更新，請重試。'};}return notesStatus;};
  if(config.obsidian)syncNotes();
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
  app.post("/api/system/shutdown", (_req, res) => {
    if (!config.desktop) {
      return res.status(403).json({ success: false, error: "Only desktop mode supports shutdown" });
    }
    res.json({ success: true, message: "System is shutting down" });
    if (config.shutdown) {
      setTimeout(() => {
        config.shutdown!().catch((err) => console.error("Shutdown error:", err));
      }, 100);
    }
  });
  let changingFolder=false;
  let choosingFolder=false;
  app.post('/api/obsidian/choose-folder',async(req,res)=>{
    if(!config.chooseNotesFolder||!config.obsidian)return res.status(400).json({error:'此服務目前不支援選擇資料夾。'});
    if(choosingFolder)return res.status(429).json({error:'資料夾選擇視窗已開啟，請先完成或取消。'});
    choosingFolder=true;
    try{const requested=typeof req.body?.path==='string'&&req.body.path.length<2000?req.body.path:config.obsidian.root;return res.json(await config.chooseNotesFolder(requested));}catch{return res.status(400).json({error:'無法開啟資料夾視窗，請重試或直接輸入路徑。'});}finally{choosingFolder=false;}
  });
  app.put('/api/obsidian/location',async(req,res)=>{
    if(!config.changeNotesFolder||typeof req.body?.path!=='string'||req.body.path.length>2000)return res.status(400).json({error:'請輸入有效的資料夾位置。'});
    if(changingFolder)return res.status(409).json({error:'目前正在變更資料夾，請稍候。'});
    changingFolder=true;
    try{config.obsidian=await config.changeNotesFolder(req.body.path);return res.json(syncNotes());}
    catch{return res.status(400).json({error:'無法變更資料夾。請確認位置可寫入；若 Obsidian 正在執行，請先關閉後重試。'});}
    finally{changingFolder=false;}
  });
  app.get('/api/obsidian/changes',(_req,res)=>{
    if(!config.obsidian)return res.json({changes:[],revision:store.read().revision});
    try{const saved=store.read();return res.json({changes:config.obsidian.changes(saved.data),revision:saved.revision});}
    catch{return res.status(503).json({error:'暫時無法讀取筆記資料夾，請稍後重試。'});}
  });
  app.post('/api/obsidian/import',(req,res)=>{
    if(!config.obsidian)return res.status(400).json({error:'此服務目前不支援筆記修改匯入。'});
    const expected=req.body?.expectedRevision,choices=req.body?.choices??{};
    if(!Number.isSafeInteger(expected)||expected<0||typeof choices!=='object'||choices===null||Array.isArray(choices))return res.status(400).json({error:'要求內容不正確。'});
    try{
      const saved=store.read();
      if(saved.revision!==expected)return res.status(409).json({error:'記錄已更新，請重新查看筆記修改後再匯入。'});
      const changes=config.obsidian.changes(saved.data);
      const data=structuredClone(saved.data);
      const keep:string[]=[];
      for(const change of changes){
        const choice=choices[change.key];
        const conflicted=change.fields.some(f=>f.conflict);
        if(choice!==undefined&&choice!=='notes'&&choice!=='app')return res.status(400).json({error:'選項不正確。'});
        if(conflicted&&choice===undefined)return res.status(409).json({error:'有修改與 App 內的內容衝突，請先選擇要保留哪一邊。'});
        if(choice==='app'){keep.push(change.key);continue;}
        applyNoteChange(data,change);
      }
      if(!isLifeData(data))return res.status(400).json({error:'筆記內容無法使用，未更動任何記錄。'});
      const result=changes.length&&keep.length<changes.length?store.write(data,expected):saved;
      for(const key of keep)config.obsidian.discard(key);
      return res.json({...result,imported:changes.length-keep.length,kept:keep.length,obsidian:syncNotes()});
    }catch(error){
      if(error instanceof ConflictError)return res.status(409).json({error:'記錄已更新，請重新查看筆記修改後再匯入。'});
      return res.status(503).json({error:'匯入未完成，原有記錄沒有改變。'});
    }
  });
  app.get('/api/obsidian',(_req,res)=>res.json(notesStatus));
  app.post('/api/obsidian/retry',(_req,res)=>{const status=syncNotes();return res.status(status.status==='pending'?503:200).json(status);});
  app.get("/api/data", (_req, res) => res.json(store.read()));
  app.put("/api/data", (req, res) => {
    if (
      !isLifeData(req.body?.data) ||
      !Number.isSafeInteger(req.body?.expectedRevision) ||
      req.body.expectedRevision < 0
    )
      return res.status(400).json({ success: false, error: "Invalid data" });
    try {
      const saved=store.write(req.body.data, req.body.expectedRevision);
      return res.json({...saved,obsidian:syncNotes()});
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
      const saved=store.write(data, req.body.expectedRevision);
      return res.json({...saved,obsidian:syncNotes()});
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

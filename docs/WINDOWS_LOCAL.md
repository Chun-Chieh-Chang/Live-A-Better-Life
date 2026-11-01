# Windows 本機操作

## 開始使用

雙擊專案根目錄的 **Start-LifeOS.cmd**，或在登入頁按「開啟我的日記」。兩者執行同一個啟用流程：檢查 Node 24 與 Bun 1.4.4、檢測及安裝 Obsidian、備份現有資料、安裝並檢查程式、登記目前使用者的排程、啟動本機服務，再開啟一次性登入頁面。首次安裝及需要修復下載時必須連網。若檢查仍失敗會停止，不會假裝啟用完成。

工具版本及 Node 下載校驗由 deploy/windows/Runtime.ps1 維護。套件依賴以 package.json 與 bun.lock 為準，採複製安裝；第一次修復失敗會用乾淨快取再試一次。網頁中的狀態檢查不再建立舊版筆記目錄，也不能代替完整 Windows 工具安裝。

此模式信任目前 Windows 使用者，以一次性連結登入，不需每次輸入密碼；連結使用後失效，且從網址中清除。服務僅監聽 127.0.0.1，不開放防火牆。完整對外部署條件見 PERSONAL_DEPLOYMENT.md。

## 資料與工具位置

```text
Live-A-Better-Life/
├─ Live-A-Better-Life-Data/
│  ├─ config.json          # 私人設定與筆記位置
│  ├─ owner.sqlite         # 個人模式權威記錄
│  ├─ agnes.dpapi          # 加密金鑰（若已設定）
│  ├─ Backups/             # 日記復原備份
│  ├─ Notes/               # 預設筆記位置，可由介面變更
│  ├─ Logs/                # 執行及錯誤記錄
│  ├─ Acceptance/          # 測試輸出
│  ├─ Reference/           # 保留的原始需求及歷史驗證資料
│  └─ Tools/               # 既有可用的私有 Node 執行工具
└─ Live-A-Better-Life-Tools/
   ├─ bun/                 # 套件管理工具
   └─ npm-cache/           # 安裝快取
```

Data/Tools 是目前 Node 已存在的有效安裝位置，config.json 的 NodePath 指向它；重新搬動只會增加排程及工具指標失效風險，故保留於私人資料區，不是另一套日記。後續需下載的新工具由專案內的 Tools 根目錄管理。兩個本機根目錄均由 Git 忽略且禁止透過開發網址讀取。

舊的同層 Data/Tools 由 LocalFolders.ps1 搬入專案，並更新設定、執行工具及 Obsidian 登記。新舊資料夾同時存在時會停止，避免合併或覆蓋。私人目錄只授權擁有者、SYSTEM 與 Administrators；DPAPI 金鑰限目前 Windows 使用者解密。日記、筆記及 JSON 備份本身沒有全部加密，不應公開或隨意上傳。

## 保存與 Obsidian

按「儲存」後才保存日記；未儲存草稿不會送出。個人模式會更新資料庫，再更新設定的筆記資料夾；筆記輸出失敗會顯示重試，不會把資料庫已保存的記錄回滾。其他裝置版本有衝突時停止覆蓋。

介面顯示目前筆記位置。展開「變更筆記位置」，可輸入路徑或使用 Windows 原生資料夾選擇視窗；按「使用這個位置」後先保存到新位置，成功才切換，舊位置保留。新增 Obsidian 保管庫前請先關閉 Obsidian，避免覆蓋其執行中的設定。原生視窗前景顯示仍待實機驗收，不能宣稱已全部通過。

目前 Obsidian 修改會先保留副本再重新輸出，尚未回寫資料庫。雙向回寫是必須完成的後續工作，唯一詳細規格見 OBSIDIAN_SYNC_PLAN.md。

## 備份與容量

LifeOS-Server 於目前使用者登入 Windows 時啟動；LifeOS-Backup 每天台北時間 03:15 備份，需使用者工作階段可用。啟動及修復前也會備份，因此一天可能有多份。

Backups 中的系統 JSON 備份保留 30 天，在新備份成功後清理過期檔案；不是最多 30 個，也沒有總容量上限。資料庫另保留最近 30 次歷史版本，兩者用途不同。未符合系統備份檔名的檔案不會自動清除。規則實作分別在 scripts/scheduled-backup.ts 與 server/personal-store.ts。

同一顆硬碟上的備份無法防止硬碟故障，請另行保留受保護的離線備份。不要為了清理專案刪除 owner.sqlite、加密金鑰或復原備份。

## 檢查與疑難排解

一般問題先重新執行 Start-LifeOS.cmd。進階檢查可在專案目錄執行：

```powershell
$config = Join-Path (Get-Location) 'Live-A-Better-Life-Data\config.json'
.\deploy\windows\Verify.ps1 -ConfigPath $config
.\deploy\windows\Backup.ps1 -ConfigPath $config
```

實際埠號以 config.json 為準，目前個人服務為 3002；3000 是獨立的瀏覽器開發模式，兩者不自動共用資料。正式服務與開發模式的記錄均寫入私人 Logs。測試與尚未驗收項目見 TESTING.md；金鑰設定見 AI_PROVIDERS.md。

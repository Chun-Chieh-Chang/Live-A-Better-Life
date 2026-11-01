# Windows 本機個人服務

已選定用途：在 `D:\Self-developed_Apps\G3\Live-A-Better-Life` 所在的 Windows 電腦，先供自己使用。服務只監聽 `127.0.0.1`，沒有開防火牆、區網存取、路由器轉發或公開網域；不用 Linux/systemd/Caddy。

雲端工作區無法直接讀寫這個 D: 路徑。本文件與腳本需先同步到該電腦；目前不能把雲端測試視為 Windows 主機已啟動或排程已生效。

## 正常啟用：雙擊 Start-LifeOS.cmd

解壓並同步程式後，直接雙擊專案根目錄的 **`Start-LifeOS.cmd`**。不用開 PowerShell、不用貼指令，也不需首次輸入登入密碼。

它會自動：

1. 重用可用的 Node 24 / Bun 1.4.4；缺少時在目前使用者的 LOCALAPPDATA 安裝私有工具，不做全機安裝。Node 從官方 HTTPS 來源下載並核對 SHA-256，Bun 透過 npm 正常完整性驗證安裝。
2. 安裝依賴、型別檢查及建置；來源指紋沒有變動時跳過重複建置。
3. 初始化受 Windows ACL 保護的資料庫；新帳號使用隨機高強度憑證，既有帳號及日誌不重設。此為信任目前 Windows 使用者的本機模式。
4. 自動登記目前使用者登入啟動與每日備份排程，啟動受排程管理的服務。
5. 等待就緒、核對匿名私密 API 保護，並用 60 秒、一次有效的連結在預設瀏覽器自動登入。連結立即從網址移除，不要分享啟動連結。
6. 執行一次恢復備份。後續 Windows 登入會自動啟動服務並開頁；重複雙擊也可重新開啟工作區。

更新程式後再次雙擊即可重新檢查及建置；程序只會停止受私有記錄識別的自身程序，先備份再更新，不會批次終止其他 Node 程序。工具下載失敗、執行政策或排程權限受阻時會停止並顯示原因，不會擅自降低執行政策或停用 TLS/憑證驗證。

真正的 Gemini 金鑰仍屬選用，程式不會捏造金鑰；沒有金鑰時使用清楚標示的規則備援。關機、休眠或未登入時無法保證持續運行。

以下手動操作章節僅供進階維護與故障診斷，正常啟用不用逐項執行。

## 安裝與第一次啟動

前置條件：Windows PowerShell 5.1 或更新版本、Node.js 24、Bun 1.4.4。使用可信任的官方安裝來源，保留簽章/TLS 驗證。若腳本被組織的執行政策擋下，依該組織政策簽署或核准腳本；這些腳本不會調降執行政策。

先保留本機未提交修改、`.env` 和現有資料，再同步程式檔。提供的 ZIP 請先解壓到新資料夾比對，不要直接覆蓋尚未備份的本機專案。不要從雲端複製 `node_modules`；Windows 需要重新安裝原生相依套件。

在一般使用者 PowerShell 執行：

```powershell
Set-Location 'D:\Self-developed_Apps\G3\Live-A-Better-Life'
.\deploy\windows\Setup.ps1
```

預設建立獨立資料目錄：

```text
D:\Self-developed_Apps\G3\Live-A-Better-Life-Data\
  config.json       # 路徑、Node 位置、連接埠，不含密碼
  owner.sqlite      # 日誌、手冊、密碼雜湊、登入與版本
  Backups\          # 排程匯出的 JSON，含私密日誌
  Logs\             # 啟動/錯誤記錄
  gemini.dpapi      # 選用：此 Windows 使用者加密的 Gemini 金鑰
```

`Setup.ps1` 檢查工具版本、用鎖定檔安裝、型別檢查與建置，再以隱藏輸入提示設定至少 14 字元的擁有者密碼。密碼只透過子程序 stdin 傳入，不會放進命令列或 config。資料夾 ACL 限目前使用者、SYSTEM 與管理員。只接受專案外的專用本機資料夾，拒絕直接採用沒有既有設定的非空資料夾，不用網路磁碟放 SQLite。

可用 `-DataRoot 'E:\LifeOS-Private' -Port 3000` 自訂資料夾與連接埠；請使用本機持久磁碟。重跑不會重設既有帳號。若先前設定中斷，可手動執行 `Set-OwnerPassword.ps1 -ConfigPath ...`；只有明確傳入 `-Reset` 才重設既有密碼並撤銷全部登入。

啟動（此 PowerShell 視窗會持續執行）：

```powershell
.\deploy\windows\Start-LifeOS.ps1 -ConfigPath 'D:\Self-developed_Apps\G3\Live-A-Better-Life-Data\config.json'
```

在另一個 PowerShell 視窗驗證：

```powershell
Set-Location 'D:\Self-developed_Apps\G3\Live-A-Better-Life'
.\deploy\windows\Verify.ps1 -ConfigPath 'D:\Self-developed_Apps\G3\Live-A-Better-Life-Data\config.json'
```

驗證腳本檢查 `/healthz`、`/readyz`、個人模式/帳號設定及實際監聽位址。接著在該電腦的瀏覽器輸入 `http://127.0.0.1:3000`，登入並驗收下方流程。不要改用 `localhost`，Origin 與 Cookie 工作區必須保持一致。沒有公開 HTTPS 是因為這一階段僅限 loopback；若要讓其他裝置連入，須另做 HTTPS 與網路驗收。

## 工作排程器

先以手動啟動通過驗收，按 Ctrl+C 停止，避免兩個程序搶同一埠。再登記目前使用者的任務：

```powershell
.\deploy\windows\Install-Tasks.ps1 -ConfigPath 'D:\Self-developed_Apps\G3\Live-A-Better-Life-Data\config.json'
Start-ScheduledTask -TaskName 'LifeOS-Server'
.\deploy\windows\Verify.ps1 -ConfigPath 'D:\Self-developed_Apps\G3\Live-A-Better-Life-Data\config.json'
Get-ScheduledTask -TaskName 'LifeOS-Server','LifeOS-Backup' | Get-ScheduledTaskInfo
```

- `LifeOS-Server`：目前使用者登入後啟動，有限次故障重啟、不重複啟動。
- `LifeOS-Backup`：每天 03:15 UTC+08:00；錯過時於條件恢復後執行。匯出成功後，僅清理超過 30 天、由本工具命名的普通備份檔，不刪除其他使用者檔案或符號連結。
- 任務採目前使用者的互動登入，不儲存 Windows 登入密碼；**登出、關機或休眠時不保證服務/備份持續運行**。電腦回到可用且已登入狀態後須確認任務執行結果。
- 現有同名但指向其他設定的任務會被拒絕覆蓋。執行政策、任務登記權限與端點防護須在實機驗證。

立即測試備份：

```powershell
.\deploy\windows\Backup.ps1 -ConfigPath 'D:\Self-developed_Apps\G3\Live-A-Better-Life-Data\config.json'
Get-ChildItem 'D:\Self-developed_Apps\G3\Live-A-Better-Life-Data\Backups'
```

同磁碟備份不能抵抗磁碟故障。請另外把已完成的 JSON 備份放到受保護的外接磁碟或備份服務。不要直接複製執行中的 `.sqlite`/WAL 當成完整備份。

## Gemini 金鑰（選用）

在同一 Windows 使用者下，將金鑰隱藏輸入並以 DPAPI 加密存入私有資料夾：

```powershell
Read-Host 'Gemini API key' -AsSecureString | ConvertFrom-SecureString | Set-Content -Encoding ASCII 'D:\Self-developed_Apps\G3\Live-A-Better-Life-Data\gemini.dpapi'
```

重新啟動程序後才載入。加密檔綁定 Windows 使用者/電腦，不可當成可攜式明文金鑰；不要把密碼、金鑰或該檔內容貼到聊天。雲端代理的憑證占位符不能拿來當本機金鑰。可於私密服務環境設定 `GEMINI_MODEL` 選擇帳號可用模型，目前預設模型尚未完成真實遠端驗收。

## 實機驗收標準

1. `Verify.ps1` 通過；只有 `127.0.0.1` 監聽，未登入的私密 API 回 401。
2. 登入、新增一篇日誌、儲存、上傳，關閉分頁後重開登入並下載，內容與日期相同。
3. 兩個瀏覽器分頁各讀取同一版本；其中一個更新後，另一個上傳收到衝突提示，服務端資料不被覆寫。
4. 停止並重啟服務，再下載仍有相同資料；登出後私密 API 不可存取。
5. 立即備份成功，將備份還原到新的 `restored.sqlite`，核對日誌/手冊；拒絕覆蓋原 DB。復原命令見通用個人部署文件。
6. 任務登記後實測登入觸發與立即備份，確認工作排程器結果與新備份檔；不能只憑任務存在判定成功。
7. 若設定真實 Gemini，自檢需回 `gemini-api` 且教練回應不是備援，才標示模型鏈路完成。

故障時先查 `Logs\server.stderr.log` 及工作排程器結果；分享紀錄前先移除私密內容。更新程式前停止自己的任務，重新建置後再啟動；不移動/覆寫資料目錄。更換 Node 安裝位置時重跑 Setup 更新 config。

## 一個指令啟動並開啟前端

完成 Setup 後，可在 Windows PowerShell 執行：

```powershell
Set-Location 'D:\Self-developed_Apps\G3\Live-A-Better-Life'
.\deploy\windows\Open-LifeOS.ps1 -ConfigPath 'D:\Self-developed_Apps\G3\Live-A-Better-Life-Data\config.json'
```

若個人服務尚未就緒，會另開 PowerShell 啟動，等待就緒後才呼叫預設瀏覽器；若服務已就緒則沿用。啟動視窗及日誌保留供診斷，不會自動執行 Setup 或建立密碼。此腳本必須在你的 Windows 電腦執行，不能以雲端工作區的啟動結果代替。

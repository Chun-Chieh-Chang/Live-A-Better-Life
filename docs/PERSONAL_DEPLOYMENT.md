# 個人多裝置版本

目前已選定先在 Windows 本機供自己使用，請優先依 [Windows 本機啟動](WINDOWS_LOCAL.md) 操作。本文的公開 HTTPS/主機條件適用未來對外部署；目前 loopback 使用不需要公開網域。

此版本支援單一擁有者帳號及保存後自動送至個人空間（含版本衝突保護），不是多人 SaaS。服務端資料保存於 SQLite；瀏覽器個人模式只使用分頁 sessionStorage 作為編輯暫存，登出時清除。按「儲存」後會自動保存至個人空間；編輯中的草稿不會同步。未完成保存時會提示，關閉頁面前會警告。

## 部署邊界

- Node 24，單一服務實例，SQLite 放在專用持久磁碟；HTTPS 由同源反向代理提供。
- **不能直接把 SQLite 放在 Cloud Run 等平台的暫存容器磁碟。** 若選擇 Cloud Run，需先改用受管理持久資料庫並重新驗收，本版本不宣稱支援該部署方式。
- 登入需 14–256 字元密碼；無預設密碼、無線上自助註冊。僅保留 scrypt 雜湊與隨機 salt。密碼變更撤銷全部登入。
- Cookie 為 HttpOnly、SameSite=Strict；HTTPS 設定下使用 Secure。登入期限 8 小時；登出撤銷該 session。寫入要求精確同源 Origin 與專用請求標頭。
- 本機模式預設只監聽 loopback，API 也檢查 loopback 位址及 Host，避免把無驗證的本機 API 直接公開。
- 服務端備份與主資料在同一磁碟，不能抵抗磁碟損壞；必須另外安排離線備份。資料未在應用層加密，應使用受保護、加密的持久磁碟與備份目的地。

## 首次設定

在部署端設定非秘密的環境變數（以下為範例，請替換為實際磁碟與網域）：

```bash
export LIFE_OS_MODE=personal
export LIFE_OS_DB_PATH=/var/lib/life-os/owner.sqlite
export LIFE_OS_ORIGIN=https://life-os.example.com
```

`LIFE_OS_ORIGIN` 必須是精確 HTTPS origin，不含尾端斜線、路徑或查詢。只有 loopback 測試可用 HTTP。磁碟路徑必須為絕對路徑，目錄由服務帳號管理；不要把私密 DB 放進 Git 或公開靜態資源目錄。

在安全互動終端設定密碼，不把密碼放進命令列參數、日誌或聊天：

```bash
read -r -s -p 'Owner password: ' life_os_password
printf '\n'
printf '%s' "$life_os_password" | npm run account:setup
unset life_os_password
```

重設密碼時使用 `npm run account:setup -- --reset`，仍從 stdin 輸入；原資料保留，所有登入失效。沒有提供真實密碼前，不會建立可登入的實際帳號。

```bash
npm run build
NODE_ENV=production npm run start
```

健康探測使用公開的 `/healthz`（僅回傳存活狀態）。私密 `/api/*` 需登入；`/api/auth/session` 與登入端點除外。反向代理須保持相同 HTTPS origin；不要額外開啟跨來源存取，不要把 API 回應加入快取。登入密碼透過 HTTPS 傳輸，對外部署前必須驗證 TLS。

目前沒有自動部署、TLS 憑證申請、第三方身分服務、跨裝置自動合併或背景自動同步。

## 每日使用與衝突

1. 登入後按「下載伺服器資料」取回已保存日誌與手冊；新服務尚無資料時，可先「匯入原本機工作區」，原瀏覽器資料保留。
2. 修改後按「儲存今日日誌」，再按「上傳已歸檔資料」。只有上傳成功才算服務端保存。
3. 每次上傳帶有已讀取的伺服器版本；其他裝置已更新時回 HTTP 409，不會覆蓋。請先下載本機 JSON，再下載伺服器版本比較。沒有自動合併；重新整理版本後再上傳代表明確取代。
4. 每次伺服器寫入前，在同一 SQLite transaction 保存原版本，保留最近 30 個寫入前版本。還原建立新版本，並保留還原前版本；還原後需在裝置上重新下載。
5. 分頁關閉、登出或 sessionStorage 被清除前，未上傳變更須先上傳或匯出。不要在不信任的共用裝置使用；離開時登出。

## 離線備份與災難復原

以服務擁有者權限，定期執行（目的地必須為尚不存在的檔案）：

```bash
LIFE_OS_DB_PATH=/var/lib/life-os/owner.sqlite npm run backup -- export /protected-backups/life-os-2026-10-31.json
```

輸出檔權限 0600，含日誌與手冊，不含密碼雜湊或 session。工具以一致的 SQLite 讀取匯出，不需直接複製正在使用中的 `.sqlite`/WAL 檔。請依部署主機的排程服務每日執行，使用唯一檔名並將副本傳送到不同受保護磁碟；排程與異地備份在目前雲端開發機尚未設定。

災難復原到**新的**資料庫路徑：

```bash
LIFE_OS_DB_PATH=/var/lib/life-os/restored.sqlite npm run backup -- restore /protected-backups/life-os-2026-10-31.json
```

工具拒絕覆蓋現有 DB；先驗證 JSON 結構，再建立新庫。復原後需重新設定擁有者密碼；版本從新庫開始計算，舊 session 不會帶入。確認還原內容正確、設定密碼及更新服務的 DB 路徑後再切換服務。每次部署及定期維護應在隔離路徑演練，不拿唯一一份資料做破壞式測試。

## Gemini 與用量

- `GEMINI_API_KEY` 需由安全的部署設定注入；`GEMINI_MODEL` 可選擇帳號實際可用的模型。預設延續現有 `gemini-3.8-flash`，其遠端可用性尚未驗證。
- 登入後才可呼叫模型；單次輸入上限 32 KiB、輸出上限 2000 tokens、同時最多 1 個模型請求。
- 個人模式限每小時 20 次、每 24 小時 100 次，從首次使用建立窗口；配額存在 DB，服務重啟不會重置。SDK 不自動重試，避免一次操作造成重複計費。自檢也計入配額，模型失敗仍計一次嘗試。
- 登入每個連線來源 15 分鐘最多 5 次嘗試；反向代理後可能共用相同來源位址。需大量登入或對外擴展時應改用成熟身分服務。
- 無金鑰/模型故障時明確顯示規則備援；Gemini 自檢失敗回 503，配額或並行超限回 429。配額是請求數限制，不是帳單金額保證。

## 驗收

```bash
npm test
npm run lint
npm run test:browser
npm run test:personal-browser
```

安全/API 測試使用暫存 DB；個人瀏覽器驗收使用兩個獨立 context 與一次實際程序重啟。測試帳號只存在暫存資料夾，測試後刪除，沒有部署預設密碼。離線備份測試將 JSON 還原至另一個新 DB 並逐項比較。這些是控制資料的驗證，不代表已對使用者真實日誌或外部正式平台做過演練。

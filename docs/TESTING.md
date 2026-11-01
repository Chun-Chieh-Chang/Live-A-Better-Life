# 測試與驗收

測試使用控制資料與獨立瀏覽器，不以測試通過推論真實外部模型或原生桌面操作已驗證。

## 執行方式

```powershell
npm test
npm run lint
npm run build
npm run test:windows-scripts
powershell.exe -NoProfile -File tests/local-folders.ps1
npm run test:activation-repair
npm run test:folder-dialog   # real folder dialog; needs an unlocked desktop
```

單元測試涵蓋資料驗證、舊資料移轉、保存失敗、備份還原、認證、衝突、AI 降級、策略自動評估、筆記輸出、私人目錄禁止 HTTP 存取、一鍵安全關閉系統、知識圖譜 JSON 與拓撲剛性檢查，以及啟動不再建立舊筆記目錄。示範資料只放在 tests/fixtures，不進入正式前端。

```powershell
$env:CHROMIUM_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run test:browser
npm run test:personal-browser
npm run test:obsidian-browser
node tests/navbar-browser.mjs
node tests/closed-loop-browser.mjs
```

後兩個測試使用已啟動的本機瀏覽器模式，預設 3000 埠。其餘測試會啟動並關閉自己的測試服務。一般與個人測試可用 CHROMIUM_PATH 指定瀏覽器；多視口與筆記測試使用已安裝的 Chrome。測試金鑰為空，不消耗真實 AI 配額。

畫面測試截圖統一寫入 Git 忽略的 Live-A-Better-Life-Data/Acceptance/browser；同一套測試覆寫自己的檔名，不把歷史截圖留在專案根目錄。

Windows 服務實機檢查使用 deploy/windows/Verify.ps1，備份使用 Backup.ps1，設定檔位置見 WINDOWS_LOCAL.md。文件連結、舊路徑引用、Git 忽略與目錄現況另以此次清理報告記錄。

## 已完成之實機與整合驗收 (2026-11-01 更新)

- **Obsidian 雙向回寫**：已實作日記與「我的小改變」手冊之雙向回寫，並通過 `tests/obsidian.test.ts` 與 `npm run test:obsidian-browser` 驗收。
- **原生資料夾視窗**：已透過 `npm run test:folder-dialog` 於已解鎖桌面實機完成真實對話框之可見度、取消、選擇與前景置頂驗收。
- **個人空間同步與介面**：已通過 `npm run test:personal-browser` 驗收多裝置隔離、CAS 衝突阻止、歷史版本還原與方案 A 微型狀態列。
- **一鍵關閉系統與背景服務**：已通過單元測試驗收桌面關閉端點授權、`Stop-LifeOS.ps1` 停止排程與平穩退出機制。
- **全景知識圖譜與拓撲剛性**：以 `tests/evolution.test.ts` 驗收 HTML 內嵌 JSON 語法與全拓撲雙向連線合規性。
- **GitHub Pages 線上站點**：已透過 `.github/workflows/deploy.yml` 門禁確效發布，並於真實 Chromium 探針實測通過（零 404、自動進入純瀏覽器模式）。
- **單元測試全數通行**：58 / 58 項單元測試、型別檢查與 Windows 腳本驗證全數通過。

## 驗證限制與環境提醒

- 執行 `npm run test:folder-dialog` 時桌面需處於已解鎖狀態（Win32 API 要求實體前景站台）。
- 本地沙盒 (Sandbox) 環境因本機連接埠隔離可能限制 127.0.0.1 網路綁定測試，單元測試需於正常本機環境執行。
- Gemini 真實金鑰與公開部署未驗收；Agnes 曾通過實際後端請求，常態確效不消耗真實 AI 配額。

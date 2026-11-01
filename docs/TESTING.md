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
```

單元測試涵蓋資料驗證、舊資料移轉、保存失敗、備份還原、認證、衝突、AI 降級、策略自動評估、筆記輸出、私人目錄禁止 HTTP 存取，以及啟動不再建立舊筆記目錄。示範資料只放在 tests/fixtures，不進入正式前端。

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

## 驗證限制

- 原生資料夾視窗的前景顯示仍待完成；筆記瀏覽器測試只驗證選擇結果、取消與套用的網頁行為。
- Obsidian 雙向回寫未完成。
- Gemini 真實金鑰與公開部署未驗收；Agnes 曾通過實際後端請求，但此次清理不發出真實 AI 請求。
- 此次清理的新結果見 PROJECT_STRUCTURE.md；歷史計畫中的舊測試數字不作為現況證據。

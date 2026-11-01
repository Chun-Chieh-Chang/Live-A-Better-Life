# 把日子過好

記下今天的感受、嘗試一個小改變，再回顧它是否有幫助。

Windows 使用者請雙擊專案內的 **Start-LifeOS.cmd**。系統會檢查工具與依賴、啟動本機服務、備份並開啟日記。首次安裝或修復需要網路。完整操作見 [Windows 操作說明](docs/WINDOWS_LOCAL.md)。

## 資料放在哪裡

- `Live-A-Better-Life-Data/`：你的日記資料庫、設定、加密金鑰、備份與筆記。不要隨意刪除。
- `Live-A-Better-Life-Tools/`：啟動與修復所需的本機工具及快取，可重新安裝。
- 筆記預設存於資料目錄內的 `Notes/`，實際位置以介面顯示及私人設定 `NotesRoot` 為準，可在介面變更。

這兩個本機目錄均由 Git 忽略，開發伺服器禁止透過網址讀取。日記與備份檔案本身並未全部加密，請妥善保護這台電腦。

## 使用範圍

目前以 Windows 單人本機使用為主，只監聽本機，不會自動發布到網路。按「儲存」後，個人模式會更新資料庫與 Obsidian 筆記；草稿不會自動送出。保存失敗或版本衝突會提示，不會靜默覆蓋另一份記錄。

AI 金鑰可選；未設定或連線失敗時仍可使用有標示的預設建議。策略的自動評估依照你填寫的結果運作，不依賴 AI。Obsidian 支援雙向筆記保存與修改帶回，並具備版本衝突保護。亦可直接透過 [GitHub Pages 線上站點](https://chun-chieh-chang.github.io/Live-A-Better-Life/) 免費體驗純瀏覽器本地模式。

## 文件入口

| 要找的內容 | 唯一維護位置 |
| --- | --- |
| 目前功能、需求來源及未完成項目 | [產品需求](docs/PRODUCT_REQUIREMENTS.md) |
| Windows 啟動、目錄、排程與備份操作 | [Windows 操作說明](docs/WINDOWS_LOCAL.md) |
| 原始碼與本機目錄用途、此次清理處置 | [專案目錄說明](docs/PROJECT_STRUCTURE.md) |
| Obsidian 保存與雙向回寫規格 | [Obsidian 整合](docs/OBSIDIAN_SYNC_PLAN.md) |
| 策略自動評估規則 | [策略閉環](docs/CLOSED_LOOP.md) |
| AI 提供者與金鑰邊界 | [AI 設定](docs/AI_PROVIDERS.md) |
| 新手用語與介面設計原則 | [介面規範](docs/UI_GUIDELINES.md) |
| 測試方式、驗收結果與限制 | [測試與驗收](docs/TESTING.md) |
| 未來對外部署的條件 | [個人部署](docs/PERSONAL_DEPLOYMENT.md) |

開發使用 Node 24 與 Bun 1.4.4；依賴版本以 `package.json` 與 `bun.lock` 為準。執行 `bun install --frozen-lockfile`、`npm run dev` 可使用獨立瀏覽器模式；它不會自動讀取個人模式的日記。檢查指令為 `npm test`、`npm run lint`、`npm run build`，瀏覽器與 Windows 檢查見測試文件。

# 開發日誌

## 2026-11-01 專案整理（SSOT / MECE）

需求：專案資料夾保持最新；過時內容移除；不宜移除的內容整合並說明。

### 結果
- 目錄責任與移除清單見 [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)，此處不重複。
- 暫時性規劃檔（task_plan.md、progress.md、findings.md）已整合進本日誌並自根目錄移除。

### 發現與原因（RCA）
| 問題 | 原因 | 矯正 / 預防（CAPA） |
| --- | --- | --- |
| `scripts/bootstrap.ts` 在專案根目錄產生第二套舊筆記結構 | 早期範本遺留，與私人資料庫、Obsidian 匯出重疊 | 移除建庫邏輯，只保留檢查；新增 `tests/bootstrap.test.ts` 防止復發 |
| 範例資料只被測試使用卻放在 `src/data` | 資料位置與使用者不一致 | 移到 `tests/fixtures/lifeData.ts` |
| 歷史逐字稿頁面無導覽入口且夾帶過時指令 | 舊功能未清除 | 移除頁面與路由；原件改存私人 Reference 並以 SHA-256 清單追溯 |
| 根目錄堆積規劃檔、開發紀錄 | 工作過程產物未歸位 | 規劃檔併入本日誌；紀錄移到私人 Logs；根目錄僅允許 PROJECT_STRUCTURE.md 所列入口檔 |

### 失敗嘗試
- 一次批次遞迴刪除被拒絕；改為逐一以明確路徑刪除檔案與空資料夾，全數成功。

### 仍未完成
- Obsidian 雙向寫回（必要功能）。
- 資料夾選擇視窗的前景實測。

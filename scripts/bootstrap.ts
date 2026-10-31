import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export interface SystemCheckReport {
  timestamp: string;
  isReady: boolean;
  env: {
    status: 'ok' | 'warning' | 'error';
    message: string;
    hasEnvFile: boolean;
    hasGeminiKey: boolean;
  };
  dependencies: {
    status: 'ok' | 'warning' | 'error';
    message: string;
    installedPackages: string[];
    missingPackages: string[];
  };
  vault: {
    status: 'ok' | 'warning' | 'error';
    message: string;
    directories: { path: string; exists: boolean }[];
    files: { path: string; exists: boolean }[];
  };
  actionsTaken: string[];
}

// Template content definitions
const TEMPLATE_DAILY_NOTE = `> [!info] 🛡️ 今日防禦與策略 (系統自動回饋)
> ![[個人操作手冊#⚡ 本週 If-Then 策略]]
> ![[個人操作手冊#🎯 本週短期外掛提問]]

---
### 狀態檢核：我今天過得好嗎？
（填寫指南：請保留今天的真實狀態，刪除另外兩個不適用的區塊）

#### 🟢 狀態：好
- **好在哪裡？**
  - 
- **如何保持 / 成功配方？** *(如需協助，請保留下方標籤並呼叫 AI)*
  - [ ] 待 AI 教練建議...

#### 🔴 狀態：不好
- **不好在哪裡？**
  - 客觀事實：
  - 主觀情緒：
- **什麼原因？**
  - 
- **明天有什麼辦法改善？** *(如需協助，請保留下方標籤並呼叫 AI)*
  - [ ] 待 AI 教練建議...

#### 🟡 狀態：普通
- **今天有哪個微小瞬間讓我感覺平靜或順利？**
  - 
- **如何放大這個瞬間？** *(如需協助，請保留下方標籤並呼叫 AI)*
  - [ ] 待 AI 教練建議...

---
### 🏷️ 今日標籤與數據
- 狀態標籤： #狀態/ （填入 🟢好、🔴不好 或 🟡普通）
- 關鍵因素： [[ ]]
`;

const TEMPLATE_PERSONAL_OS = `# 📖 我的個人操作手冊 (Personal Operating System)
*(這是本系統的資料中樞，請於每週日進行復盤與提煉)*

## ⚡ 本週 If-Then 策略
*(將每日反省中「有效的改善辦法」提煉於此，隔天會自動投影到新日誌中)*
- [x] If 遇到預期外的挫折， Then 先深呼吸三次，區分「事實」與「情緒」。
- [x] If 晚上 11 點到了， Then 把手機拿到客廳充電，換看紙本書或拉筋放鬆。
- [x] If 開會時被打斷或老闆急躁催促， Then 先拿起水杯喝一口溫水，延遲 2 秒再回應。

## 🎯 本週短期外掛提問
*(本週想刻意練習的微小習慣，作為晨間防禦機制)*
- [x] 我今天有在 12 點前放下手機睡覺嗎？
- [x] 今天有喝滿 2000cc 的水嗎？

## 🎁 我的快樂與急救配方庫
*(歷史好日子的成功配方總結)*
### 睡滿 7.5 小時 \`#睡眠品質\`
所有情緒穩定與專注力的最底層物理基礎。睡眠不足時絕不批判自己的智商。

### 熱美式 + 20 分鐘公園散步 \`#身心充電\`
工作卡關時最快重置大腦的方式。曬太陽與步伐節奏會刺激血清素分泌。

### 洗完澡後的無目的閱讀 \`#無用之美\`
看一本與工作完全無關的小說或科普書，把大腦從產出模式切換到吸收模式。

## 💣 我的避坑指南
*(歷史壞日子的血淚教訓，避免重蹈覆轍)*
### 絕對不要在肚子餓或血糖低時做決定 \`#生理防禦\`
飢餓會讓大腦邊緣系統接管，極易發脾氣或簽署草率決定。先吃顆茶葉蛋再說。

### 絕對不要在晚上 10 點後討論嚴肅人際關係 \`#關係界線\`
夜間的前額葉皮質疲倦，自我反思容易變成災難化聯想。重要對話一律推遲至隔天白天。

### 不要把「別人的焦慮」當成「自己的過錯」 \`#課題分離\`
主管的急躁多半源於他自身的壓力，不是因為我不夠好。課題分離，專注把手邊事情理清。
`;

const TEMPLATE_AI_COACH_RULES = `# 🤖 AI 認知副處理器 行為準則 (System Prompt)

當使用者在對話框輸入「幫我完成今日復盤」、「幫我找解法」或呼叫 \`/coach\` 時，AI Agent 必須嚴格執行以下 SOP：

1. **讀取上下文：** 
   - 讀取 \`01_日誌\` 中最新的一篇（或使用者指定日期）的檔案。
   - 讀取 \`03_知識庫/個人操作手冊.md\` 的歷史經驗與避坑指南。
2. **定位問題點：** 
   - 找出日記中標記為 \`[ ] 待 AI 教練建議...\` 的區塊。
   - 綜合分析使用者今天填寫的「客觀事實」、「情緒」、「原因」或「微小瞬間」。
3. **生成策略原則（極度重要）：**
   - **化繁為簡：** 絕不提供宏大、耗費意志力的計畫（如：每天運動一小時）。只提供極低啟動門檻的「行為設計」（如：把運動鞋放在門口）。
   - **If-Then 格式：** 改善策略需盡量採用「If [具體觸發情境], Then [微小且具體的行動]」句型。
   - **同理與客觀：** 運用阿德勒「課題分離」視角，溫和地接納使用者的不完美，將挫折視為優化系統的數據。
4. **輸出與執行：**
   - 直接輸出 2~3 個具體的 Markdown 列表建議。
   - 若使用者有授權 IDE 自動寫入權限，請直接將建議覆蓋掉日記檔案中的 \`[ ] 待 AI 教練建議...\` 標籤。
`;

/**
 * Perform full system check and auto-scaffold missing parts
 */
export function runSystemCheckAndSetup(autoFix = true): SystemCheckReport {
  const actionsTaken: string[] = [];
  
  // 1. Check & Setup Environment (.env)
  const envPath = path.join(rootDir, '.env');
  const envExamplePath = path.join(rootDir, '.env.example');
  let hasEnvFile = fs.existsSync(envPath);

  if (!hasEnvFile && autoFix) {
    if (fs.existsSync(envExamplePath)) {
      try {
        fs.copyFileSync(envExamplePath, envPath);
        hasEnvFile = true;
        actionsTaken.push('已自動從 .env.example 建立 .env 設定檔');
      } catch (e: any) {
        console.error('Failed to create .env:', e);
      }
    } else {
      try {
        fs.writeFileSync(envPath, 'GEMINI_API_KEY=""\n', 'utf-8');
        hasEnvFile = true;
        actionsTaken.push('已自動初始化 .env 設定檔');
      } catch (e: any) {
        console.error('Failed to create basic .env:', e);
      }
    }
  }

  // Check if GEMINI_API_KEY is present
  const geminiKey = process.env.GEMINI_API_KEY || '';
  const hasGeminiKey = Boolean(geminiKey && geminiKey !== 'MY_GEMINI_API_KEY');

  const envReport: SystemCheckReport['env'] = {
    status: hasEnvFile ? 'ok' : 'warning',
    message: hasEnvFile 
      ? (hasGeminiKey ? '環境配置完整，GEMINI_API_KEY 已載入' : '環境檔已就緒，可選填 GEMINI_API_KEY 啟用進階 AI 功能（目前啟用啟發式副處理器備援）')
      : '未偵測到 .env 檔案',
    hasEnvFile,
    hasGeminiKey
  };

  // 2. Check Core Dependencies
  const requiredPackages = [
    '@google/genai',
    'express',
    'dotenv',
    'react',
    'react-dom',
    'lucide-react',
    'motion',
    'canvas-confetti'
  ];

  const installedPackages: string[] = [];
  const missingPackages: string[] = [];

  for (const pkg of requiredPackages) {
    try {
      // Check if installed in node_modules
      const pkgPath = path.join(rootDir, 'node_modules', pkg);
      if (fs.existsSync(pkgPath)) {
        installedPackages.push(pkg);
      } else {
        missingPackages.push(pkg);
      }
    } catch {
      missingPackages.push(pkg);
    }
  }

  const depReport: SystemCheckReport['dependencies'] = {
    status: missingPackages.length === 0 ? 'ok' : 'error',
    message: missingPackages.length === 0
      ? `所有核心相依套件均已就緒 (${installedPackages.length}/${requiredPackages.length})`
      : `缺少相依套件：${missingPackages.join(', ')}`,
    installedPackages,
    missingPackages
  };

  // 3. Check Obsidian Vault Directories & Core Files
  const requiredDirs = ['01_日誌', '02_模版', '03_知識庫'];
  const dirCheckResults: { path: string; exists: boolean }[] = [];

  for (const dirName of requiredDirs) {
    const fullDirPath = path.join(rootDir, dirName);
    let exists = fs.existsSync(fullDirPath);
    if (!exists && autoFix) {
      try {
        fs.mkdirSync(fullDirPath, { recursive: true });
        exists = true;
        actionsTaken.push(`已建立 Obsidian 資料夾：${dirName}`);
      } catch (e: any) {
        console.error(`Failed to create dir ${dirName}:`, e);
      }
    }
    dirCheckResults.push({ path: dirName, exists });
  }

  // Core files inside Vault
  const requiredFiles = [
    { relPath: '02_模版/每日自我教練模版.md', content: TEMPLATE_DAILY_NOTE },
    { relPath: '03_知識庫/個人操作手冊.md', content: TEMPLATE_PERSONAL_OS },
    { relPath: '03_知識庫/AI教練行為準則.md', content: TEMPLATE_AI_COACH_RULES }
  ];

  const fileCheckResults: { path: string; exists: boolean }[] = [];

  for (const item of requiredFiles) {
    const fullFilePath = path.join(rootDir, item.relPath);
    let exists = fs.existsSync(fullFilePath);
    if (!exists && autoFix) {
      try {
        const parentDir = path.dirname(fullFilePath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        fs.writeFileSync(fullFilePath, item.content, 'utf-8');
        exists = true;
        actionsTaken.push(`已自動生成核心檔案：${item.relPath}`);
      } catch (e: any) {
        console.error(`Failed to write file ${item.relPath}:`, e);
      }
    }
    fileCheckResults.push({ path: item.relPath, exists });
  }

  const allDirsOk = dirCheckResults.every(d => d.exists);
  const allFilesOk = fileCheckResults.every(f => f.exists);

  const vaultReport: SystemCheckReport['vault'] = {
    status: allDirsOk && allFilesOk ? 'ok' : 'warning',
    message: allDirsOk && allFilesOk
      ? 'Obsidian 知識庫結構健全（3 個目錄與 3 個核心模版檔案已全部就緒）'
      : 'Obsidian 知識庫結構不完整，已執行自動補齊',
    directories: dirCheckResults,
    files: fileCheckResults
  };

  const isReady = depReport.status !== 'error' && envReport.status !== 'error';

  return {
    timestamp: new Date().toISOString(),
    isReady,
    env: envReport,
    dependencies: depReport,
    vault: vaultReport,
    actionsTaken
  };
}

// CLI runner if executed directly
if (process.argv[1] && process.argv[1].endsWith('bootstrap.ts')) {
  console.log('⚡ 正在執行系統啟動自檢與自動配置 (Life OS Bootstrap)...');
  const report = runSystemCheckAndSetup(true);
  console.log('----------------------------------------------------');
  console.log(`[環境配置] ${report.env.message}`);
  console.log(`[相依套件] ${report.dependencies.message}`);
  console.log(`[知識庫目錄] ${report.vault.message}`);
  if (report.actionsTaken.length > 0) {
    console.log('✅ 自動修復與配置項目：');
    report.actionsTaken.forEach(a => console.log(`   - ${a}`));
  } else {
    console.log('✅ 系統所有配置均已就緒，無須額外修復！');
  }
  console.log('----------------------------------------------------');
}

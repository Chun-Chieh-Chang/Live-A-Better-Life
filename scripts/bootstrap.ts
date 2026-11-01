import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { SystemCheckReport } from '../src/types.ts';
export type { SystemCheckReport } from '../src/types.ts';
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Application checks do not create a second notes vault. Windows activation owns
// installation; ObsidianMirror alone owns the generated notes in configured NotesRoot.
export function runSystemCheckAndSetup(autoFix = true, projectRoot = rootDir): SystemCheckReport {
  const actionsTaken: string[] = [];
  const envPath = path.join(projectRoot, '.env');
  const example = path.join(projectRoot, '.env.example');
  if (autoFix && !fs.existsSync(envPath) && fs.existsSync(example)) {
    fs.copyFileSync(example, envPath, fs.constants.COPYFILE_EXCL);
    actionsTaken.push('已建立本機設定檔');
  }
  const hasEnvFile = fs.existsSync(envPath);
  const hasGeminiKey = !!process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('MY_');
  const hasAgnesKey = !!process.env.AGNES_API_KEY;
  const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const packages = Object.keys(manifest.dependencies || {});
  const installedPackages = packages.filter(name => fs.existsSync(path.join(projectRoot,'node_modules',name)));
  const missingPackages = packages.filter(name => !installedPackages.includes(name));
  return {
    timestamp: new Date().toISOString(),
    isReady: missingPackages.length === 0,
    env: {
      status: hasGeminiKey || hasAgnesKey ? 'ok' : 'warning',
      message: hasGeminiKey || hasAgnesKey
        ? 'AI 服務已設定；連線結果以實際請求為準。'
        : '尚未設定 AI 服務，目前可使用預設建議。',
      hasEnvFile, hasGeminiKey, hasAgnesKey,
    },
    dependencies: {
      status: missingPackages.length ? 'error' : 'ok',
      message: missingPackages.length ? '程式配件尚未完整，請重新啟用。' : '程式配件已就緒。',
      installedPackages, missingPackages,
    },
    actionsTaken,
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = runSystemCheckAndSetup(true);
  console.log(report.env.message);
  console.log(report.dependencies.message);
  for (const action of report.actionsTaken) console.log(action);
  if (!report.isReady) process.exitCode = 1;
}

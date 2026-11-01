/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { DailyEntry, PersonalOS, ActiveTab } from './types';
import { emptyData, todayString, type LifeData } from './utils/validation';
import { loadData, saveData, restoreBackup, DATA_KEY } from './utils/storage';
import { downloadFile } from './utils/markdownExporter';
import { CloudSyncPanel } from './components/CloudSyncPanel';
import { apiFetch } from './utils/api';
import { Navbar } from './components/Navbar';
import { DailyReflectionTab } from './components/DailyReflectionTab';
import { PersonalOSTab } from './components/PersonalOSTab';
import { InsightsTab } from './components/InsightsTab';
import { ZenSanctuary3D } from './components/ZenSanctuary3D';
import { ArchifyDiagramTab } from './components/ArchifyDiagramTab';
import { ObsidianExportTab } from './components/ObsidianExportTab';
import { TranscriptBlueprintTab } from './components/TranscriptBlueprintTab';
import { SystemHealthModal, SystemStatusData } from './components/SystemHealthModal';

const LOCAL_STORAGE_ENTRIES_KEY = 'life_os_daily_entries_v1';
const LOCAL_STORAGE_OS_KEY = 'life_os_personal_manual_v1';

export default function App({storage=localStorage, personal}: {storage?:Storage;personal?:{workspaceId:string;onLogout:()=>Promise<void>}} = {}) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('daily');
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatusData | null>(null);

  const fetchSystemStatus = async () => {
    try {
      const res = await apiFetch('/api/system/status');
      const data = await res.json();
      if (!res.ok || !data.success || !data.report) throw new Error('Status request failed');
      if (data.success && data.report) {
        setSystemStatus(data.report);
      }
    } catch (e) {
      setSystemStatus(null);
    }
  };

  const handleTriggerAutoSetup = async () => {
    try {
      const res = await apiFetch('/api/system/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success || !data.report) throw new Error('Status request failed');
      if (data.success && data.report) {
        setSystemStatus(data.report);
        if (!data.report.isReady) throw new Error('Local setup incomplete');
      }
    } catch (e) {
      throw e;
    }
  };

  useEffect(() => {
    fetchSystemStatus();
  }, []);

  const [initial] = useState(() => {
    try { return {data: loadData(storage), error: '', token: storage.getItem(DATA_KEY)}; }
    catch { return {data: emptyData(), token:null, error: '無法讀取本機資料。原始資料未變更；請先下載原始資料，勿清除網站資料。'}; }
  });
  const storedToken = useRef(initial.token);
  const [data, setData] = useState(initial.data);
  const [storageError, setStorageError] = useState(initial.error);
  const [selectedDate, setSelectedDate] = useState(todayString);
  const {entries, personalOS} = data;
  const commit = (next: LifeData, importing = false): boolean => {
    if (initial.error) return false;
    try {
      if (storage.getItem(DATA_KEY) !== storedToken.current) {setStorageError('另一個分頁已修改資料，為避免覆蓋已停止儲存。請先下載目前內容並重新整理後再試。'); return false;}
      if (importing) restoreBackup(storage, data, next);
      else saveData(storage, next);
      storedToken.current = storage.getItem(DATA_KEY);
      setData(next); setStorageError(''); return true;
    } catch {
      setStorageError('儲存失敗，可能空間不足或瀏覽器禁止寫入。內容尚未保存，請保留草稿或下載備份後重試。');
      return false;
    }
  };
  const handleSaveEntry = (entry: DailyEntry) => commit({...data, entries: [entry, ...entries.filter(e => e.date !== entry.date)].sort((a,b)=>b.date.localeCompare(a.date))});
  const updatePersonalOS = (next: PersonalOS) => commit({...data, personalOS: next});

  // Add an If-Then strategy directly from Daily reflection
  const handleAddIfThenStrategy = (
    ifText: string, 
    thenText: string, 
    category: 'work' | 'health' | 'emotion' | 'life' = 'life'
  ) => {
    const newStrategy = {
      id: `strat-${Date.now()}`,
      ifText,
      thenText,
      active: true,
      category,
      sourceDate: selectedDate
    };
    return updatePersonalOS({...personalOS, ifThenStrategies: [newStrategy, ...personalOS.ifThenStrategies]});
  };

  // Import backup data
  const handleImportData = (importedEntries: DailyEntry[], importedOS: PersonalOS) => {
    return commit({entries: importedEntries, personalOS: importedOS, draftScope:crypto.randomUUID()}, true);
  };

  const handleSelectDateFromHistory = (date: string) => {
    setSelectedDate(date);
    setActiveTab('daily');
  };

  return (
    <div className="min-h-screen bg-[#fefcf5] text-[#2c332d] flex flex-col font-sans selection:bg-[#dcead9] selection:text-[#1e3020]">
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        entries={entries}
        onOpenSystemHealth={() => setIsHealthModalOpen(true)}
        systemReady={systemStatus?.isReady}
      />

      <div className="max-w-6xl mx-auto px-4 py-2 text-sm">
        <p>{personal ? '此裝置使用分頁暫存；請透過上方同步區上傳已歸檔資料。' : '資料僅保存於此瀏覽器，請定期匯出備份。'}Obsidian 提供手動匯出，尚無同步功能。</p>
        {storageError && <div role="alert" className="text-red-700">{storageError}
          <button onClick={() => {try {downloadFile('life-os-raw-recovery.json', JSON.stringify({v2:storage.getItem('life_os_data_v2'),entries:storage.getItem('life_os_daily_entries_v1'),personalOS:storage.getItem('life_os_personal_manual_v1')}, null, 2), 'application/json');} catch {setStorageError('瀏覽器禁止讀取，請保留目前頁面並檢查瀏覽器儲存權限。');}}}>下載原始資料</button>
        </div>}
      </div>
      {personal && <CloudSyncPanel data={data} onReplace={next=>handleImportData(next.entries,next.personalOS)} onLogout={personal.onLogout}/>}
      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6">
        <div hidden={activeTab !== 'daily'}>
          <DailyReflectionTab
            storage={storage}
            cacheNamespace={personal?.workspaceId}
            key={`${data.draftScope || 'default'}-${selectedDate}`}
            draftScope={data.draftScope || 'default'}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            readOnly={!!initial.error}
            entries={entries}
            onSaveEntry={handleSaveEntry}
            personalOS={personalOS}
            onAddIfThenStrategy={handleAddIfThenStrategy}
          />
        </div>

        {activeTab === 'personalOS' && (
          <PersonalOSTab
            personalOS={personalOS}
            onUpdatePersonalOS={updatePersonalOS}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsTab
            entries={entries}
            onSelectDate={handleSelectDateFromHistory}
          />
        )}

        {activeTab === 'zen3d' && (
          <ZenSanctuary3D
            entries={entries}
            onSelectDate={handleSelectDateFromHistory}
          />
        )}

        {activeTab === 'architecture' && (
          <ArchifyDiagramTab />
        )}

        {activeTab === 'obsidian' && (
          <ObsidianExportTab
            entries={entries}
            personalOS={personalOS}
            storage={storage}
            onImportData={handleImportData}
          />
        )}

        {activeTab === 'transcript' && (
          <TranscriptBlueprintTab />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e8e5d8] bg-[#fbf9f1]/90 py-6 text-center text-xs text-[#6d756e] mt-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-medium text-[#444d45]">
            把日子過好 · 個人自我教練與閉環知識庫 (Personal Operating System)
          </p>
          <p className="text-[11px] text-[#868f87]">
            阿德勒課題分離 · 福格微小行為模型 · Obsidian 雙向連結閉環架構
          </p>
        </div>
      </footer>

      {/* System Health and Auto-Config Modal */}
      <SystemHealthModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        statusData={systemStatus}
        onRefresh={fetchSystemStatus}
        onTriggerSetup={handleTriggerAutoSetup}
      />
    </div>
  );
}

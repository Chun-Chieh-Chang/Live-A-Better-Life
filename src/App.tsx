/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DailyEntry, PersonalOS, ActiveTab } from './types';
import { INITIAL_ENTRIES, INITIAL_PERSONAL_OS } from './data/initialData';
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

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('daily');
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatusData | null>(null);

  const fetchSystemStatus = async () => {
    try {
      const res = await fetch('/api/system/status');
      const data = await res.json();
      if (data.success && data.report) {
        setSystemStatus(data.report);
      }
    } catch (e) {
      console.warn('System status check request failed:', e);
    }
  };

  const handleTriggerAutoSetup = async () => {
    try {
      const res = await fetch('/api/system/setup', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.report) {
        setSystemStatus(data.report);
      }
    } catch (e) {
      console.error('Auto setup request failed:', e);
    }
  };

  useEffect(() => {
    fetchSystemStatus();
  }, []);

  // Load entries from localStorage or fallback to rich initial data
  const [entries, setEntries] = useState<DailyEntry[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_ENTRIES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // If saved has fewer than 20 entries, supplement with INITIAL_ENTRIES to ensure full 30-day data
          if (parsed.length < 20) {
            const map = new Map<string, DailyEntry>();
            INITIAL_ENTRIES.forEach(e => map.set(e.date, e));
            parsed.forEach(e => map.set(e.date, e));
            return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load entries from localStorage', e);
    }
    return INITIAL_ENTRIES;
  });

  // Load Personal OS from localStorage or fallback
  const [personalOS, setPersonalOS] = useState<PersonalOS>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_OS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load personalOS from localStorage', e);
    }
    return INITIAL_PERSONAL_OS;
  });

  // Persist entries
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_ENTRIES_KEY, JSON.stringify(entries));
    } catch (e) {
      console.error('Failed to save entries to localStorage', e);
    }
  }, [entries]);

  // Persist Personal OS
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_OS_KEY, JSON.stringify(personalOS));
    } catch (e) {
      console.error('Failed to save personalOS to localStorage', e);
    }
  }, [personalOS]);

  // Save or update an entry
  const handleSaveEntry = (newEntry: DailyEntry) => {
    setEntries(prev => {
      const existsIndex = prev.findIndex(e => e.date === newEntry.date);
      if (existsIndex >= 0) {
        const copy = [...prev];
        copy[existsIndex] = newEntry;
        return copy;
      }
      return [newEntry, ...prev];
    });
  };

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
      sourceDate: new Date().toISOString().split('T')[0]
    };
    setPersonalOS(prev => ({
      ...prev,
      ifThenStrategies: [newStrategy, ...prev.ifThenStrategies]
    }));
  };

  // Import backup data
  const handleImportData = (importedEntries: DailyEntry[], importedOS: PersonalOS) => {
    setEntries(importedEntries);
    setPersonalOS(importedOS);
  };

  const handleSelectDateFromHistory = (_date: string) => {
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
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6">
        {activeTab === 'daily' && (
          <DailyReflectionTab
            entries={entries}
            onSaveEntry={handleSaveEntry}
            personalOS={personalOS}
            onAddIfThenStrategy={handleAddIfThenStrategy}
          />
        )}

        {activeTab === 'personalOS' && (
          <PersonalOSTab
            personalOS={personalOS}
            onUpdatePersonalOS={setPersonalOS}
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

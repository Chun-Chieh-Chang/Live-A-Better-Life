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
import { ObsidianExportTab } from './components/ObsidianExportTab';
import { TranscriptBlueprintTab } from './components/TranscriptBlueprintTab';

const LOCAL_STORAGE_ENTRIES_KEY = 'life_os_daily_entries_v1';
const LOCAL_STORAGE_OS_KEY = 'life_os_personal_manual_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('daily');

  // Load entries from localStorage or fallback to rich initial data
  const [entries, setEntries] = useState<DailyEntry[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_ENTRIES_KEY);
      if (saved) {
        return JSON.parse(saved);
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
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-emerald-900/60 selection:text-emerald-200">
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        entries={entries}
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
      <footer className="border-t border-stone-800/80 bg-stone-950/80 py-6 text-center text-xs text-stone-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            把日子過好 · 個人自我教練與閉環知識庫 (Personal Operating System)
          </p>
          <p className="text-[11px] text-stone-600">
            阿德勒課題分離 · 福格微小行為模型 · Obsidian 雙向連結閉環架構
          </p>
        </div>
      </footer>
    </div>
  );
}

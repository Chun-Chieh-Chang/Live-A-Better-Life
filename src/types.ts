export type DayState = 'good' | 'bad' | 'normal';

export interface DailyEntry {
  id: string;
  date: string; // YYYY-MM-DD
  state: DayState;
  
  // 🟢 好日子
  goodWhere?: string;
  goodKeep?: string;
  
  // 🔴 不好日子
  badFact?: string;
  badEmotion?: string;
  badReason?: string;
  badImprove?: string;
  
  // 🟡 普通日子
  normalMoment?: string;
  normalAmplify?: string;
  
  // 標籤與雙向連結
  tags: string[]; // e.g. ["#睡眠品質", "#職場溝通"]
  factors: string[]; // e.g. ["[[散步]]", "[[老闆]]"]
  
  // AI 輔助與回饋
  aiCoached?: boolean;
  aiAdvice?: {
    strategies: string[];
    psychologicalInsight: string;
    suggestedTag?: string;
    encouragement?: string;
  };
  
  createdAt: string;
  updatedAt: string;
}

export interface IfThenStrategy {
  id: string;
  ifText: string;
  thenText: string;
  active: boolean; // 是否在晨間日誌中投影
  category?: 'work' | 'health' | 'emotion' | 'life';
  sourceDate?: string;
}

export interface HabitQuestion {
  id: string;
  text: string;
  active: boolean; // 是否在晨間日誌中投影
}

export interface EmergencyRecipe {
  id: string;
  title: string;
  description: string;
  tag: string;
}

export interface AvoidanceGuide {
  id: string;
  title: string;
  lesson: string;
  tag: string;
}

export interface PersonalOS {
  ifThenStrategies: IfThenStrategy[];
  habitQuestions: HabitQuestion[];
  emergencyRecipes: EmergencyRecipe[];
  avoidanceGuides: AvoidanceGuide[];
}

export type ActiveTab = 'daily' | 'personalOS' | 'insights' | 'zen3d' | 'architecture' | 'obsidian' | 'transcript';

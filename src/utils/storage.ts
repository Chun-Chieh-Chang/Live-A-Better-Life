import { emptyData, isLifeData, type LifeData } from "./validation";
export const DATA_KEY = "life_os_data_v2";
export const RECOVERY_KEY = "life_os_before_import_v1";
export function loadData(storage: Storage): LifeData {
  const saved = storage.getItem(DATA_KEY);
  if (saved !== null) {
    const envelope = JSON.parse(saved);
    if (envelope.version !== 2 || !isLifeData(envelope.data))
      throw new Error("已保存的資料格式異常，原始資料未變更。請先備份或復原。");
    return envelope.data;
  }
  const entries = storage.getItem("life_os_daily_entries_v1");
  const os = storage.getItem("life_os_personal_manual_v1");
  const data = {
    entries: entries ? JSON.parse(entries) : [],
    personalOS: os ? JSON.parse(os) : emptyData().personalOS,
  };
  if (!isLifeData(data)) throw new Error("舊版資料格式異常，原始資料未變更。");
  return data;
}
export function saveData(storage: Storage, data: LifeData) {
  if (!isLifeData(data)) throw new Error("資料格式不正確，未儲存。");
  storage.setItem(DATA_KEY, JSON.stringify({ version: 2, data }));
}
export function restoreBackup(
  storage: Storage,
  current: LifeData,
  next: LifeData,
) {
  if (!isLifeData(next)) throw new Error("備份格式不正確");
  storage.setItem(
    RECOVERY_KEY,
    JSON.stringify({
      version: "1.0",
      exportedAt: new Date().toISOString(),
      ...current,
    }),
  );
  saveData(storage, next);
}

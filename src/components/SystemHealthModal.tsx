import React, { useState } from "react";
import type {SystemCheckReport as SystemStatusData} from '../types';
export type {SystemCheckReport as SystemStatusData} from '../types';

interface SystemHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusData: SystemStatusData | null;
  onRefresh: () => void;
  onTriggerSetup: () => Promise<void>;
}

export const SystemHealthModal: React.FC<SystemHealthModalProps> = ({
  isOpen,
  onClose,
  statusData,
  onRefresh,
  onTriggerSetup,
}) => {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="使用狀態"
        className="bg-[#fefcf5] rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto space-y-4 text-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center gap-3">
          <h2 className="text-xl font-bold">使用狀態</h2>
          <button
            autoFocus
            className="min-h-11 min-w-11 border rounded-xl"
            onClick={onClose}
          >
            關閉
          </button>
        </div>
        <p>
          {statusData?.isReady
            ? "可以開始記錄了。"
            : statusData
              ? "目前需要檢查，請稍後重試。"
              : "暫時無法確認連線，請重新檢查。"}
        </p>
        <p>教練連線未設定或暫時無法使用時，仍會提供清楚標示的預設建議。</p>
        <div className="flex flex-wrap gap-3">
          <button
            className="min-h-11 px-4 border rounded-xl"
            onClick={onRefresh}
          >
            重新檢查
          </button>
          <button
            disabled={busy}
            className="min-h-11 px-4 border rounded-xl"
            onClick={async () => {
              setBusy(true);
              try {
                await onTriggerSetup();
                setMessage("已完成檢查。");
              } catch {
                setMessage("還沒準備好，請稍後再試。");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "處理中…" : "嘗試修復"}
          </button>
        </div>
        <p role="status">{message}</p>
      </section>
    </div>
  );
};

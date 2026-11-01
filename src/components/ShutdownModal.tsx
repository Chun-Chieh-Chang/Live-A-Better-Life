import React, { useState } from "react";
import { AlertTriangle, Power } from "lucide-react";

interface ShutdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const ShutdownModal: React.FC<ShutdownModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    setError("");
    try {
      await onConfirm();
    } catch {
      setError("關閉請求發送失敗，請確認服務連線後再試一次。");
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shutdown-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Power className="w-6 h-6" />
            </div>
            <div>
              <h2 id="shutdown-modal-title" className="text-lg font-bold text-gray-900">
                關閉系統與背景服務
              </h2>
              <p className="text-sm text-gray-500">結束今日使用並釋放背景資源</p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
            <p>
              您的日記、小改變與所有設定皆已<strong>自動妥善保存</strong>。
            </p>
            <p>
              確認後，系統將安全關閉背景服務、停止背景排程與關閉筆記視窗。下次需要使用時，點擊電腦上的<strong>「Start-LifeOS」</strong>捷徑即可隨時啟動。
            </p>
          </div>

          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/60 text-xs text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              若您方才直接在 Obsidian 視窗中編輯筆記，請確認文字已停頓，本機檔案已自動保存於電腦中。
            </span>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="min-h-11 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl border border-gray-200"
            >
              取消
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirm}
              className="min-h-11 px-5 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl flex items-center gap-2"
            >
              {submitting ? "正在安全關閉…" : "確認關閉"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

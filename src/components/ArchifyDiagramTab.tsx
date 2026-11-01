import React from "react";
import { Network } from "lucide-react";

interface ArchifyDiagramTabProps {
  onNavigateToGraph?: () => void;
}

export function ArchifyDiagramTab({ onNavigateToGraph }: ArchifyDiagramTabProps) {
  return (
    <section className="space-y-6 pb-10 animate-in fade-in duration-300">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">從今天開始</h1>
          <p className="mt-2 text-[#616c62]">
            不用寫得完整，留下一點感受就很好。
          </p>
        </div>
        {onNavigateToGraph && (
          <button
            type="button"
            onClick={onNavigateToGraph}
            className="min-h-11 px-4 py-2.5 bg-white hover:bg-gray-50 border border-[#e8e5d8] rounded-xl text-sm font-medium text-[#444d45] flex items-center gap-2 self-start sm:self-auto transition-colors cursor-pointer shadow-xs"
          >
            <Network className="w-4 h-4 text-[#4d6b53]" />
            <span>查看系統全景知識圖譜</span>
          </button>
        )}
      </header>
      <ol className="space-y-4">
        {[
          [
            "記下今天的感受",
            "在「今天」選擇心情，再寫幾句發生的事。寫完後按「儲存今天的記錄」。",
          ],
          [
            "留下一個想試的方法",
            "不知道下一步怎麼做時，可以請教練幫忙。喜歡的建議按「加入手冊」，就會留在「我的小改變」。",
          ],
          [
            "看看方法有沒有幫助",
            "回到「今天」，記下方法的嘗試結果。連續三次都沒幫助時，會先暫停提醒；你可以補填或更正結果。",
          ],
          [
            "偶爾回頭看看",
            "在「生活回顧」看看之前的記錄。也請定期到「備份」下載一份，留在自己手邊。",
          ],
        ].map(([title, body], i) => (
          <li
            key={title}
            className="border border-[#e8e5d8] bg-white/60 rounded-xl p-5"
          >
            <h2 className="text-lg font-semibold">
              {i + 1}. {title}
            </h2>
            <p className="mt-2 text-[#616c62] leading-relaxed">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

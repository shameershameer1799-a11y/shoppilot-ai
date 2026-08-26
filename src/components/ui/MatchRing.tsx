export function MatchRing({ score }: { score: number }) {
  const color = score >= 85 ? "#14b8a6" : score >= 65 ? "#f59e0b" : "#ef4444";
  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 font-mono"
      style={{ background: `conic-gradient(${color} ${score}%, #e2e8f0 0)` }}
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono">
        {score}%
      </div>
    </div>
  );
}

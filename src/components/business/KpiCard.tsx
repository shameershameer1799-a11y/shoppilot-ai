import { TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function KpiCard({ label, value, delta, up }: { label: string; value: string; delta: string; up: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-slate-500 mb-2">{label}</div>
      <div className="text-2xl font-bold font-display">{value}</div>
      <div className={`text-xs font-semibold mt-1 flex items-center gap-1 ${up ? "text-teal-500" : "text-red-500"}`}>
        {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {delta}
      </div>
    </Card>
  );
}

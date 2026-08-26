import { Check } from "lucide-react";
import { ORDER_STAGES } from "@/lib/utils";

const LABELS: Record<string, string> = {
  ordered: "Ordered", processing: "Processing", shipped: "Shipped",
  out_for_delivery: "Out for Delivery", delivered: "Delivered",
};

export function OrderTracker({ status }: { status: string }) {
  if (status === "cancelled") {
    return <div className="mt-4 text-sm text-red-600 font-medium">Order cancelled</div>;
  }
  const currentIdx = ORDER_STAGES.indexOf(status as any);

  return (
    <div>
      <div className="flex items-center mt-4 mb-1">
        {ORDER_STAGES.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-white text-[10px] shrink-0 ${currentIdx >= i ? "bg-teal-500" : "bg-slate-300 dark:bg-slate-700"}`}>
              {currentIdx >= i ? <Check size={11} /> : ""}
            </div>
            {i < ORDER_STAGES.length - 1 && <div className={`flex-1 h-0.5 ${currentIdx > i ? "bg-teal-500" : "bg-slate-300 dark:bg-slate-700"}`} />}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-slate-500">
        {ORDER_STAGES.map((s) => <span key={s}>{LABELS[s]}</span>)}
      </div>
    </div>
  );
}

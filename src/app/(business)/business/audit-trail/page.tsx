import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema, isDbConfigured } from "@/lib/db";
import { desc } from "drizzle-orm";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ShieldCheck, Clock, FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import { money } from "@/lib/utils";

export default async function AuditTrailPage() {
  const user = await getCurrentUser();
  if (!user || user.accountType !== "business") redirect("/login");

  let auditEntries: any[] = [];
  if (isDbConfigured()) {
    const db = getDb();
    auditEntries = await db.query.agentAuditTrail.findMany({
      orderBy: desc(schema.agentAuditTrail.createdAt),
      limit: 50,
    });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-display">Agent Audit Trail</h1>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
              <ShieldCheck size={13} /> Persisted &amp; Auditable
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Immutable log of all autonomous Buyer Agent and Merchant Growth Agent decisions and financial actions
          </p>
        </div>
        <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
          Showing last <b>{auditEntries.length}</b> events
        </div>
      </div>

      {/* Audit Log Table */}
      <Card className="overflow-x-auto shadow-sm">
        {auditEntries.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No agent activity recorded yet. Run a shopping search in <b>AI Shop</b> or ask a question in <b>AI Growth Assistant</b> to populate real logs.
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-slate-500">
                <th className="p-3.5 font-semibold">Timestamp</th>
                <th className="p-3.5 font-semibold">Agent Persona</th>
                <th className="p-3.5 font-semibold">Action &amp; Tool</th>
                <th className="p-3.5 font-semibold">Reason / Explainability</th>
                <th className="p-3.5 font-semibold">Amount</th>
                <th className="p-3.5 font-semibold">Status</th>
                <th className="p-3.5 font-semibold">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {auditEntries.map((entry) => {
                const isBuyer = entry.agent === "BUYER_AGENT";
                const dateStr = new Date(entry.createdAt).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                });

                return (
                  <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                    <td className="p-3.5 whitespace-nowrap text-slate-400 font-mono">
                      {dateStr}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <Badge
                        className={`text-[10px] font-bold ${
                          isBuyer
                            ? "bg-violet-100 text-violet-800 border-violet-200"
                            : "bg-teal-100 text-teal-800 border-teal-200"
                        }`}
                      >
                        {isBuyer ? "BUYER AGENT" : "GROWTH AGENT"}
                      </Badge>
                    </td>
                    <td className="p-3.5">
                      <b className="text-slate-800 dark:text-slate-200 block text-[11px]">
                        {entry.action.replace(/_/g, " ")}
                      </b>
                      {entry.tool && (
                        <span className="text-[10px] font-mono text-slate-400">
                          tool: {entry.tool}()
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 max-w-xs text-slate-600 dark:text-slate-300">
                      <p className="line-clamp-2 leading-relaxed text-[11px]">
                        {entry.reason || entry.inputSummary || "—"}
                      </p>
                    </td>
                    <td className="p-3.5 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                      {entry.amount ? money(Number(entry.amount)) : "—"}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <Badge
                        className={`text-[10px] ${
                          entry.approvalStatus === "EXECUTED" || entry.approvalStatus === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : entry.approvalStatus === "PENDING"
                            ? "bg-amber-100 text-amber-800 border-amber-200"
                            : entry.approvalStatus === "REJECTED"
                            ? "bg-red-100 text-red-800 border-red-200"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {entry.approvalStatus}
                      </Badge>
                    </td>
                    <td className="p-3.5 max-w-xs text-[11px] text-slate-500">
                      {entry.failureReason ? (
                        <span className="text-red-600 flex items-center gap-1">
                          <AlertTriangle size={12} /> {entry.failureReason}
                        </span>
                      ) : (
                        <span className="line-clamp-1">{entry.result || "Completed"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

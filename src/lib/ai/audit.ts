import { getDb, schema } from "@/lib/db";

export type AuditAgentType = "BUYER_AGENT" | "MERCHANT_GROWTH_AGENT";

export type AuditLogParams = {
  agent: AuditAgentType;
  action: string;
  tool?: string;
  userId?: string | null;
  businessId?: string | null;
  inputSummary?: string;
  reason?: string;
  amount?: number | string;
  approvalStatus?: "N_A" | "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "EXECUTED";
  result?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Persists an agent action to the persistent database audit trail.
 * Never throws an unhandled exception so business flows are never blocked by logging.
 */
export async function recordAgentAction(params: AuditLogParams) {
  try {
    const db = getDb();
    const [entry] = await db
      .insert(schema.agentAuditTrail)
      .values({
        agent: params.agent,
        action: params.action,
        tool: params.tool,
        userId: params.userId ?? null,
        businessId: params.businessId ?? null,
        inputSummary: params.inputSummary,
        reason: params.reason,
        amount: params.amount !== undefined ? String(params.amount) : null,
        approvalStatus: params.approvalStatus ?? "N_A",
        result: params.result,
        failureReason: params.failureReason,
        metadata: params.metadata ?? {},
      })
      .returning();
    return entry;
  } catch (err) {
    console.error("Failed to record agent audit trail entry:", err);
    return null;
  }
}

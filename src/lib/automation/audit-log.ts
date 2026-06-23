import { isAdminConfigured } from "@/lib/firebase/admin-app";
import { getAdminDb } from "@/lib/firebase/admin-db";
import type { AuditLog, UserRole } from "@/types";

const demoAuditLogs: AuditLog[] = [];

export interface CreateAuditLogInput {
  action: string;
  actorId: string;
  actorRole: UserRole;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
  const entry: AuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    action: input.action,
    actorId: input.actorId,
    actorRole: input.actorRole,
    resource: input.resource,
    resourceId: input.resourceId,
    metadata: input.metadata,
    createdAt: new Date().toISOString(),
  };

  if (isAdminConfigured()) {
    try {
      const db = getAdminDb();
      await db.collection("audit_logs").doc(entry.id).set(entry);
      return entry;
    } catch (error) {
      console.warn("Firebase audit log failed, using demo store:", error);
    }
  }

  demoAuditLogs.unshift(entry);
  return entry;
}

export async function getAuditLogs(limit = 50): Promise<AuditLog[]> {
  if (isAdminConfigured()) {
    try {
      const db = getAdminDb();
      const snapshot = await db
        .collection("audit_logs")
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();
      return snapshot.docs.map((doc) => doc.data() as AuditLog);
    } catch (error) {
      console.warn("Firebase audit log fetch failed:", error);
    }
  }

  return demoAuditLogs.slice(0, limit);
}

export function resetDemoAuditLogs(): void {
  demoAuditLogs.length = 0;
}

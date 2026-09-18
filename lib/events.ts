// Append-only event logging. Never update or delete rows here.

import { db } from "@/lib/db";
import { eventLog } from "@/lib/db/schema";

export type EventInput = {
  entityType: "document" | "version" | "task";
  entityId: string;
  documentId?: string | null;
  actorId?: string | null;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function logEvent(e: EventInput): Promise<void> {
  await db.insert(eventLog).values({
    entityType: e.entityType,
    entityId: e.entityId,
    documentId: e.documentId ?? null,
    actorId: e.actorId ?? null,
    action: e.action,
    fromStatus: e.fromStatus ?? null,
    toStatus: e.toStatus ?? null,
    metadata: e.metadata ?? null,
  });
}

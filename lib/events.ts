// Append-only event logging. Never update or delete rows here.

import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventLog, users } from "@/lib/db/schema";

export type EventInput = {
  entityType: "document" | "version" | "task" | "process";
  entityId?: string | null;
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
    entityId: e.entityId ?? null,
    documentId: e.documentId ?? null,
    actorId: e.actorId ?? null,
    action: e.action,
    fromStatus: e.fromStatus ?? null,
    toStatus: e.toStatus ?? null,
    metadata: e.metadata ?? null,
  });
}

export type TimelineEntry = {
  id: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  metadata: unknown;
  createdAt: Date;
  actorName: string | null;
};

/** Chronological event history for one document (append-only log). */
export async function listDocumentEvents(documentId: string): Promise<TimelineEntry[]> {
  return db
    .select({
      id: eventLog.id,
      action: eventLog.action,
      fromStatus: eventLog.fromStatus,
      toStatus: eventLog.toStatus,
      metadata: eventLog.metadata,
      createdAt: eventLog.createdAt,
      actorName: users.name,
    })
    .from(eventLog)
    .leftJoin(users, eq(eventLog.actorId, users.id))
    .where(eq(eventLog.documentId, documentId))
    .orderBy(asc(eventLog.createdAt));
}

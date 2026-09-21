// In-app notifications (+ best-effort email via Resend).
// Insert a notification row per recipient; email is fire-and-forget and
// never blocks or fails the workflow transition.

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications, users, documents, processes } from "@/lib/db/schema";
import { sendEmail, notificationEmailHtml } from "@/lib/email";

/** Resolve a document's process page path (for notification links). */
async function linkForDocument(documentId: string): Promise<string> {
  const [row] = await db
    .select({ slug: processes.slug })
    .from(documents)
    .innerJoin(processes, eq(documents.processId, processes.id))
    .where(eq(documents.id, documentId));
  return row ? `/process/${row.slug}` : "/inbox";
}

export type NotifyInput = {
  recipientId: string | null | undefined;
  type: string;
  title: string;
  body?: string;
  documentId?: string | null;
  taskId?: string | null;
};

/** Create one in-app notification + send email (best-effort). */
export async function notify(input: NotifyInput): Promise<void> {
  if (!input.recipientId) return;

  await db.insert(notifications).values({
    userId: input.recipientId,
    documentId: input.documentId ?? null,
    taskId: input.taskId ?? null,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
  });

  try {
    const [u] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, input.recipientId));
    if (u?.email) {
      const base = process.env.AUTH_URL ?? "http://localhost:3000";
      const path = input.documentId ? await linkForDocument(input.documentId) : "/inbox";
      await sendEmail({
        to: u.email,
        subject: input.title,
        html: notificationEmailHtml({
          title: input.title,
          body: input.body,
          linkUrl: base + path,
        }),
      });
    }
  } catch (err) {
    console.error("notify email failed:", err);
  }
}

/** Notify several recipients (deduped, skips falsy). */
export async function notifyMany(
  recipientIds: (string | null | undefined)[],
  n: Omit<NotifyInput, "recipientId">,
): Promise<void> {
  const unique = [...new Set(recipientIds.filter(Boolean) as string[])];
  await Promise.all(unique.map((id) => notify({ ...n, recipientId: id })));
}

// ---------- Read side (bell + page) ----------

export async function countUnread(userId: string): Promise<number> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return rows.length;
}

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: Date;
  documentId: string | null;
  processSlug: string | null;
};

export async function listNotifications(
  userId: string,
  limit = 60,
): Promise<NotificationItem[]> {
  return db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      documentId: notifications.documentId,
      processSlug: processes.slug,
    })
    .from(notifications)
    .leftJoin(documents, eq(notifications.documentId, documents.id))
    .leftJoin(processes, eq(documents.processId, processes.id))
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markAllRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

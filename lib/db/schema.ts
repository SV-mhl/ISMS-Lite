// ============================================================
// ISMS-Lite — Database schema (Drizzle / PostgreSQL)
// Event-log-centric: every document activity is appended to
// `event_log` (append-only). Files live on Google Drive; the DB
// stores only metadata + drive_file_id + workflow state.
// ============================================================

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  unique,
  index,
} from "drizzle-orm/pg-core";

// ---------- Enums ----------
export const userRole = pgEnum("user_role", ["admin", "isms_manager", "member"]);

export const docStatus = pgEnum("doc_status", [
  "draft",
  "review",
  "approved",
  "published",
  "rejected",
  "superseded",
]);

export const flowRole = pgEnum("flow_role", ["reviewer", "approver"]);
export const taskType = pgEnum("task_type", ["review", "approve"]);
export const taskStatus = pgEnum("task_status", ["pending", "done", "rejected"]);

// ---------- Users ----------
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  googleSub: text("google_sub").unique(), // set on first Google login (Step 2)
  email: text("email").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  role: userRole("role").notNull().default("member"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Processes (seed: 18 ISO processes Y01–Y17) ----------
export const processes = pgTable("processes", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(), // "Y01"
  slug: text("slug").notNull().unique(), // "y01"
  no: integer("no").notNull(), // display number
  phaseKey: text("phase_key").notNull(), // p1..p4
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  driveFolderId: text("drive_folder_id"), // set in Step 3
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Default reviewer/approver per process ----------
export const processAssignees = pgTable(
  "process_assignees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    processId: uuid("process_id")
      .notNull()
      .references(() => processes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    flowRole: flowRole("flow_role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("uq_process_assignee").on(t.processId, t.userId, t.flowRole)],
);

// ---------- Documents ----------
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    processId: uuid("process_id")
      .notNull()
      .references(() => processes.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    docCode: text("doc_code"),
    status: docStatus("status").notNull().default("draft"),
    // points to the latest (working) document_versions.id
    currentVersionId: uuid("current_version_id"),
    // last PUBLISHED version — stays downloadable while a revision is in progress
    effectiveVersionId: uuid("effective_version_id"),
    // check-out lock (controlled-document revision)
    checkedOutBy: uuid("checked_out_by").references(() => users.id, { onDelete: "set null" }),
    checkedOutAt: timestamp("checked_out_at", { withTimezone: true }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    // designated reviewer/approver for the current workflow cycle
    reviewerId: uuid("reviewer_id").references(() => users.id, { onDelete: "set null" }),
    approverId: uuid("approver_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_documents_process").on(t.processId)],
);

// ---------- Document versions (each = one check-in to Drive) ----------
export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    versionNo: integer("version_no").notNull(), // internal sequential
    versionMajor: integer("version_major").notNull().default(1), // semantic label major
    versionMinor: integer("version_minor").notNull().default(0), // semantic label minor (1.0, 1.1, 2.0)
    driveFileId: text("drive_file_id").notNull(),
    driveFileName: text("drive_file_name").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    isCurrent: boolean("is_current").notNull().default(false),
  },
  (t) => [
    unique("uq_document_version_no").on(t.documentId, t.versionNo),
    index("idx_versions_document").on(t.documentId),
  ],
);

// ---------- Workflow tasks (feeds the Task Inbox) ----------
export const workflowTasks = pgTable(
  "workflow_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    versionId: uuid("version_id").references(() => documentVersions.id, {
      onDelete: "set null",
    }),
    assigneeId: uuid("assignee_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    taskType: taskType("task_type").notNull(),
    status: taskStatus("status").notNull().default("pending"),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    actedAt: timestamp("acted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_tasks_assignee_status").on(t.assigneeId, t.status),
    index("idx_tasks_document").on(t.documentId),
  ],
);

// ---------- Event log (APPEND-ONLY — never updated/deleted) ----------
export const eventLog = pgTable(
  "event_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: text("entity_type").notNull(), // document | version | task
    entityId: uuid("entity_id").notNull(),
    documentId: uuid("document_id"), // for per-document timeline
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(), // uploaded | submitted_review | reviewed | approved | rejected | published | superseded | downloaded | ...
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_event_document").on(t.documentId, t.createdAt),
    index("idx_event_actor").on(t.actorId),
  ],
);

// ---------- Google OAuth tokens (for backend Drive calls, Step 3+) ----------
export const googleAccounts = pgTable("google_accounts", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  scope: text("scope"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Notifications (in-app inbox; email in Step 5) ----------
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    documentId: uuid("document_id"),
    taskId: uuid("task_id"),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_notifications_user_read").on(t.userId, t.isRead)],
);

// ---------- ISO Action Plan (calendar + reminders) ----------
export const cadence = pgEnum("cadence", [
  "monthly",
  "quarterly",
  "biannual",
  "annual",
  "once",
]);

export const actionItems = pgTable("action_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  year: integer("year").notNull(), // plan year (fiscal), e.g. 2026
  seq: integer("seq").notNull(),
  title: text("title").notNull(),
  responsible: text("responsible"), // group name, e.g. "ISMS Team"
  qpRef: text("qp_ref"), // e.g. "QP-17"
  category: text("category"), // KPI / Standard Operation / Training
  cadence: cadence("cadence").notNull(),
  leadDays: integer("lead_days").notNull().default(7), // advance-reminder days (admin-adjustable)
  notifyUserId: uuid("notify_user_id").references(() => users.id, { onDelete: "set null" }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const actionOccurrences = pgTable(
  "action_occurrences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => actionItems.id, { onDelete: "cascade" }),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    periodLabel: text("period_label").notNull(),
    status: text("status").notNull().default("pending"), // pending | done
    remindedAt: timestamp("reminded_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: uuid("completed_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_occurrence").on(t.itemId, t.periodLabel),
    index("idx_occurrence_due").on(t.dueDate, t.status),
  ],
);

// ---------- Inferred types ----------
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Process = typeof processes.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type WorkflowTask = typeof workflowTasks.$inferSelect;
export type EventLogEntry = typeof eventLog.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type GoogleAccount = typeof googleAccounts.$inferSelect;
export type ActionItem = typeof actionItems.$inferSelect;
export type ActionOccurrence = typeof actionOccurrences.$inferSelect;

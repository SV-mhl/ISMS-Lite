// Pure access/workflow policy — no DB/IO, so it is unit-testable and shared
// between the server (enforcement) and client (button visibility).

export type DocLite = {
  status: string;
  createdBy: string;
  reviewerId: string | null;
  approverId: string | null;
  pendingTask?: { type: "review" | "approve"; assigneeId: string } | null;
};

export type UserLite = { id: string; role: "admin" | "member" };

/** Published docs are downloadable by anyone; otherwise only the people
 *  involved (or admin) may fetch the PDF (to review it). */
export function canDownload(doc: DocLite, user: UserLite): boolean {
  if (doc.status === "published") return true;
  if (user.role === "admin") return true;
  return [doc.createdBy, doc.reviewerId, doc.approverId].includes(user.id);
}

/** Watermark headline based on publication state. */
export function watermarkMainText(status: string): string {
  return status === "published" ? "CONTROLLED COPY" : "DRAFT - NOT FOR DISTRIBUTION";
}

export type WorkflowAction = "submit" | "review" | "approve" | "reject" | "publish";

/** Which workflow actions the user may take on a document, given its state.
 *  Mirrors the server-side guards in lib/workflow.ts. */
export function availableActions(doc: DocLite, user: UserLite): WorkflowAction[] {
  const acts: WorkflowAction[] = [];
  const isOwner = doc.createdBy === user.id || user.role === "admin";

  if ((doc.status === "draft" || doc.status === "rejected") && isOwner) {
    acts.push("submit");
  }
  if (doc.status === "review" && doc.pendingTask?.type === "review" && doc.pendingTask.assigneeId === user.id) {
    acts.push("review", "reject");
  }
  if (doc.status === "review" && doc.pendingTask?.type === "approve" && doc.pendingTask.assigneeId === user.id) {
    acts.push("approve", "reject");
  }
  if (doc.status === "approved" && (user.role === "admin" || doc.approverId === user.id)) {
    acts.push("publish");
  }
  return acts;
}

import { describe, it, expect } from "vitest";
import {
  canDownload,
  canDelete,
  watermarkMainText,
  availableActions,
  type DocLite,
  type UserLite,
} from "./policy";

const author: UserLite = { id: "u-author", role: "member" };
const reviewer: UserLite = { id: "u-rev", role: "member" };
const approver: UserLite = { id: "u-app", role: "member" };
const stranger: UserLite = { id: "u-other", role: "member" };
const admin: UserLite = { id: "u-admin", role: "admin" };

function doc(overrides: Partial<DocLite> = {}): DocLite {
  return {
    status: "draft",
    createdBy: "u-author",
    reviewerId: "u-rev",
    approverId: "u-app",
    pendingTask: null,
    ...overrides,
  };
}

describe("canDownload", () => {
  it("published → anyone", () => {
    expect(canDownload(doc({ status: "published" }), stranger)).toBe(true);
  });
  it("draft → only involved or admin", () => {
    expect(canDownload(doc(), author)).toBe(true);
    expect(canDownload(doc(), reviewer)).toBe(true);
    expect(canDownload(doc(), approver)).toBe(true);
    expect(canDownload(doc(), admin)).toBe(true);
    expect(canDownload(doc(), stranger)).toBe(false);
  });
});

describe("canDelete", () => {
  it("author/admin can delete a never-published draft", () => {
    expect(canDelete(doc({ status: "draft" }), author)).toBe(true);
    expect(canDelete(doc({ status: "draft" }), admin)).toBe(true);
    expect(canDelete(doc({ status: "draft" }), stranger)).toBe(false);
  });
  it("cannot delete non-draft", () => {
    expect(canDelete(doc({ status: "review" }), author)).toBe(false);
    expect(canDelete(doc({ status: "published" }), admin)).toBe(false);
  });
  it("cannot delete a draft that was published before (in revision)", () => {
    expect(canDelete(doc({ status: "draft", effectiveVersionId: "v-1" }), admin)).toBe(false);
  });
});

describe("watermarkMainText", () => {
  it("marks published vs not", () => {
    expect(watermarkMainText("published")).toBe("CONTROLLED COPY");
    expect(watermarkMainText("draft")).toContain("DRAFT");
    expect(watermarkMainText("approved")).toContain("DRAFT");
  });
});

describe("availableActions", () => {
  it("author can submit a draft", () => {
    expect(availableActions(doc({ status: "draft" }), author)).toContain("submit");
    expect(availableActions(doc({ status: "draft" }), reviewer)).not.toContain("submit");
  });
  it("author can resubmit a rejected doc", () => {
    expect(availableActions(doc({ status: "rejected" }), author)).toContain("submit");
  });
  it("assigned reviewer sees review + reject at review gate", () => {
    const d = doc({ status: "review", pendingTask: { type: "review", assigneeId: "u-rev" } });
    expect(availableActions(d, reviewer).sort()).toEqual(["reject", "review"]);
    expect(availableActions(d, approver)).toEqual([]);
  });
  it("assigned approver sees approve + reject at approve gate", () => {
    const d = doc({ status: "review", pendingTask: { type: "approve", assigneeId: "u-app" } });
    expect(availableActions(d, approver).sort()).toEqual(["approve", "reject"]);
    expect(availableActions(d, reviewer)).toEqual([]);
  });
  it("approver or admin can publish an approved doc", () => {
    expect(availableActions(doc({ status: "approved" }), approver)).toEqual(["publish"]);
    expect(availableActions(doc({ status: "approved" }), admin)).toEqual(["publish"]);
    expect(availableActions(doc({ status: "approved" }), stranger)).toEqual([]);
  });
  it("published doc has no further actions", () => {
    expect(availableActions(doc({ status: "published" }), admin)).toEqual([]);
  });
});

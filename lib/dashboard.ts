// Read-only aggregates for the dashboard. Small single-tenant dataset →
// simple select + reduce in JS (no heavy SQL grouping needed).

import { db } from "@/lib/db";
import { documents, processes } from "@/lib/db/schema";

export type StatusCounts = {
  draft: number;
  review: number;
  approved: number;
  published: number;
  rejected: number;
  superseded: number;
  total: number;
};

export async function getStatusCounts(): Promise<StatusCounts> {
  const rows = await db.select({ status: documents.status }).from(documents);
  const c: StatusCounts = {
    draft: 0, review: 0, approved: 0, published: 0, rejected: 0, superseded: 0, total: rows.length,
  };
  for (const r of rows) {
    if (r.status in c) (c as unknown as Record<string, number>)[r.status]++;
  }
  return c;
}

export type ProcessProgress = {
  code: string;
  slug: string;
  title: string;
  phaseKey: string;
  total: number;
  published: number;
};

export async function getProcessProgress(): Promise<ProcessProgress[]> {
  const procs = await db.select().from(processes).orderBy(processes.sortOrder);
  const docs = await db
    .select({ processId: documents.processId, status: documents.status })
    .from(documents);

  const byProc = new Map<string, { total: number; published: number }>();
  for (const d of docs) {
    const e = byProc.get(d.processId) ?? { total: 0, published: 0 };
    e.total++;
    if (d.status === "published") e.published++;
    byProc.set(d.processId, e);
  }

  return procs.map((p) => {
    const e = byProc.get(p.id) ?? { total: 0, published: 0 };
    return {
      code: p.code,
      slug: p.slug,
      title: p.title,
      phaseKey: p.phaseKey,
      total: e.total,
      published: e.published,
    };
  });
}

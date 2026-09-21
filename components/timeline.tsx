import type { TimelineEntry } from "@/lib/events";

const ACTION_META: Record<string, { label: string; icon: string }> = {
  checked_in: { label: "เช็คอินเอกสาร", icon: "📥" },
  version_added: { label: "อัปโหลดเวอร์ชันใหม่", icon: "📄" },
  submitted_review: { label: "ส่งตรวจ", icon: "➡️" },
  reviewed: { label: "ตรวจผ่าน", icon: "👀" },
  approved: { label: "อนุมัติ", icon: "✅" },
  rejected: { label: "ตีกลับ", icon: "↩️" },
  published: { label: "เผยแพร่", icon: "📢" },
  downloaded: { label: "ดาวน์โหลด PDF", icon: "⬇️" },
};

function fmt(d: Date): string {
  return new Date(d).toLocaleString("th-TH", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function detailOf(e: TimelineEntry): string | null {
  const m = e.metadata as Record<string, unknown> | null;
  if (!m) return null;
  if (typeof m.comment === "string" && m.comment) return `“${m.comment}”`;
  if (typeof m.versionNo === "number") return `เวอร์ชัน v${m.versionNo}`;
  return null;
}

export default function Timeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <div style={{ fontSize: 12.5, color: "#9db0c8" }}>ยังไม่มีประวัติ</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {entries.map((e, i) => {
        const meta = ACTION_META[e.action] ?? { label: e.action, icon: "•" };
        const detail = detailOf(e);
        const last = i === entries.length - 1;
        return (
          <div key={e.id} style={{ display: "flex", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                width: 28, height: 28, borderRadius: 14, background: "#eef4fc",
                border: "1px solid #cfe0f4", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 14, flex: "none",
              }}>{meta.icon}</div>
              {!last && <div style={{ width: 2, flex: 1, background: "#e2eaf5", minHeight: 14 }} />}
            </div>
            <div style={{ paddingBottom: last ? 0 : 14 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#12233f" }}>{meta.label}</div>
              <div style={{ fontSize: 11.5, color: "#7189a8", marginTop: 1 }}>
                {e.actorName ?? "ระบบ"} · {fmt(e.createdAt)}
              </div>
              {detail && <div style={{ fontSize: 12, color: "#3c536f", marginTop: 3 }}>{detail}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const STATUS_META: Record<
  string,
  { label: string; bg: string; fg: string }
> = {
  draft: { label: "ร่าง", bg: "#eef1f5", fg: "#5d6b7f" },
  review: { label: "รอตรวจ", bg: "#fff3e0", fg: "#b5730f" },
  approved: { label: "อนุมัติแล้ว", bg: "#e7f0fd", fg: "#1a4c9e" },
  published: { label: "เผยแพร่", bg: "#e6f6ec", fg: "#178048" },
  rejected: { label: "ตีกลับ", bg: "#fdeeee", fg: "#b23b3b" },
  superseded: { label: "ถูกแทนที่", bg: "#eceff3", fg: "#7a8aa0" },
};

export default function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.draft;
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 20,
        background: m.bg,
        color: m.fg,
        whiteSpace: "nowrap",
      }}
    >
      {m.label}
    </span>
  );
}

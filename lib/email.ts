// Transactional email via Resend REST API (no SDK).
// No-op (returns false) when RESEND_API_KEY is unset, so the app works
// fully without email configured.

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const from = process.env.EMAIL_FROM ?? "ISMS-Lite <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html }),
    });
    if (!res.ok) {
      console.error("Resend error", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("sendEmail failed:", err);
    return false;
  }
}

/** Minimal branded HTML wrapper for notification emails. */
export function notificationEmailHtml(opts: {
  title: string;
  body?: string;
  linkUrl: string;
  linkLabel?: string;
}): string {
  const { title, body, linkUrl, linkLabel = "เปิดเอกสาร" } = opts;
  return `<!doctype html><html><body style="margin:0;background:#f3f7fc;font-family:'IBM Plex Sans Thai',Arial,sans-serif;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #dbe6f4;border-radius:14px;overflow:hidden">
    <div style="background:linear-gradient(115deg,#07234f,#1450a8);padding:18px 22px;color:#fff;font-weight:700;font-size:15px">🛡️ ISMS-Lite · มโหฬาร</div>
    <div style="padding:22px">
      <div style="font-size:16px;font-weight:700;color:#12233f;margin-bottom:8px">${escapeHtml(title)}</div>
      ${body ? `<div style="font-size:13.5px;color:#3c536f;line-height:1.7;margin-bottom:18px">${escapeHtml(body)}</div>` : ""}
      <a href="${linkUrl}" style="display:inline-block;background:#1450a8;color:#fff;text-decoration:none;font-size:13.5px;font-weight:600;padding:10px 18px;border-radius:9px">${escapeHtml(linkLabel)}</a>
    </div>
    <div style="padding:12px 22px;border-top:1px solid #eef3fa;font-size:11px;color:#9db0c8">อีเมลอัตโนมัติจากระบบจัดการเอกสาร ISMS — โปรดอย่าตอบกลับ</div>
  </div></body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

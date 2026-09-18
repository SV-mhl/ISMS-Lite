import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const thai = IBM_Plex_Sans_Thai({
  weight: ["400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ISMS-Lite · ศูนย์จัดการเอกสาร ISO 27001 — มโหฬาร",
  description:
    "แพลตฟอร์มจัดการเอกสารและกระบวนการเตรียมความพร้อม ISO/IEC 27001:2022 แบบ Lite — เช็คอินเอกสารขึ้น Google Drive, workflow ตรวจ–อนุมัติ, และบันทึกเหตุการณ์ทุกขั้นตอน",
  applicationName: "ISMS-Lite",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "ISMS-Lite" },
};

export const viewport: Viewport = {
  themeColor: "#0d356f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${thai.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}

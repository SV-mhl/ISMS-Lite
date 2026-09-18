import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ISMS-Lite · ศูนย์จัดการเอกสาร ISO 27001 มโหฬาร",
    short_name: "ISMS-Lite",
    description:
      "จัดการเอกสารและกระบวนการเตรียมความพร้อม ISO/IEC 27001:2022 — เช็คอิน Google Drive, workflow ตรวจ–อนุมัติ, บันทึกเหตุการณ์",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f7fc",
    theme_color: "#0d356f",
    lang: "th",
    orientation: "portrait-primary",
    icons: [
      // Icon assets จะถูกสร้างใน Step 8 (PWA polish)
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

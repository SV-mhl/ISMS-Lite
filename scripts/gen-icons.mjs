// Generate PWA icons (navy + jade shield) → public/. Run: node scripts/gen-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

function svg(shieldScale) {
  return `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0a2a5e"/><stop offset="1" stop-color="#1450a8"/>
  </linearGradient></defs>
  <rect width="512" height="512" rx="0" fill="url(#g)"/>
  <g transform="translate(256 262) scale(${shieldScale}) translate(-256 -262)">
    <path d="M256 96 L392 150 V300 C392 372 330 418 256 444 C182 418 120 372 120 300 V150 Z" fill="#12a394"/>
    <path d="M210 298 l34 34 l74 -98" fill="none" stroke="#ffffff" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
}

mkdirSync("public", { recursive: true });

const targets = [
  { file: "public/icon-192.png", size: 192, scale: 1 },
  { file: "public/icon-512.png", size: 512, scale: 1 },
  { file: "public/icon-maskable-512.png", size: 512, scale: 0.78 }, // extra safe-zone padding
];

for (const t of targets) {
  await sharp(Buffer.from(svg(t.scale))).resize(t.size, t.size).png().toFile(t.file);
  console.log("✓", t.file);
}
console.log("Icons generated.");

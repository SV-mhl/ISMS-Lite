// Stamp a diagonal watermark + traceability footer onto every page of a PDF.
// Uses pdf-lib standard fonts (ASCII watermark text — no Thai glyphs needed).

import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

export async function watermarkPdf(
  input: Buffer,
  opts: { mainText: string; footer: string },
): Promise<Buffer> {
  const pdf = await PDFDocument.load(input, { ignoreEncryption: true });
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const reg = await pdf.embedFont(StandardFonts.Helvetica);

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();

    // Diagonal main watermark (centered-ish, light gray, translucent)
    const size = Math.max(24, Math.min(58, (width * 1.05) / opts.mainText.length));
    page.drawText(opts.mainText, {
      x: width * 0.12,
      y: height * 0.32,
      size,
      font: bold,
      color: rgb(0.55, 0.6, 0.68),
      rotate: degrees(45),
      opacity: 0.13,
    });

    // Traceability footer (who/when/status) at bottom-left
    page.drawText(opts.footer, {
      x: 22,
      y: 14,
      size: 7,
      font: reg,
      color: rgb(0.42, 0.46, 0.52),
      opacity: 0.9,
    });
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

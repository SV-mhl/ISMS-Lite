import { describe, it, expect } from "vitest";
import { imageToPdf, watermarkPdf } from "./pdf";

// 1x1 transparent PNG (well-known minimal valid PNG).
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

describe("imageToPdf", () => {
  it("wraps a PNG into a valid single-page PDF", async () => {
    const pdf = await imageToPdf(TINY_PNG, "image/png");
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("output can be watermarked like any other PDF (regression: image check-ins used to fail here)", async () => {
    const pdf = await imageToPdf(TINY_PNG, "image/png");
    const stamped = await watermarkPdf(pdf, { mainText: "DRAFT", footer: "test" });
    expect(stamped.subarray(0, 4).toString()).toBe("%PDF");
  });
});

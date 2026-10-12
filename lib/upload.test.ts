import { describe, it, expect } from "vitest";
import { assertAcceptedCheckinMimeType, UnsupportedFileTypeError } from "./upload";

describe("assertAcceptedCheckinMimeType", () => {
  it("allows pdf, jpeg, png and Office formats", () => {
    for (const mime of [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
    ]) {
      expect(() => assertAcceptedCheckinMimeType(mime)).not.toThrow();
    }
  });

  it("rejects unsupported types (e.g. zip, gif) with a 400", () => {
    for (const mime of ["application/zip", "image/gif", "application/octet-stream"]) {
      expect(() => assertAcceptedCheckinMimeType(mime)).toThrow(UnsupportedFileTypeError);
    }
    try {
      assertAcceptedCheckinMimeType("image/gif");
    } catch (e) {
      expect((e as UnsupportedFileTypeError).status).toBe(400);
    }
  });
});

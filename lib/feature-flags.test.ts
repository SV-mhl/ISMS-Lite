import { describe, it, expect } from "vitest";
import { isUrlCheckinEnabled } from "./feature-flags";

describe("isUrlCheckinEnabled", () => {
  it("enabled only for the y08 pilot process", () => {
    expect(isUrlCheckinEnabled("y08")).toBe(true);
  });
  it("disabled for every other process", () => {
    expect(isUrlCheckinEnabled("y01")).toBe(false);
    expect(isUrlCheckinEnabled("y17")).toBe(false);
    expect(isUrlCheckinEnabled("")).toBe(false);
  });
});

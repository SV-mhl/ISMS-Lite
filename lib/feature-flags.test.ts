import { describe, it, expect } from "vitest";
import { isUrlCheckinEnabled } from "./feature-flags";

describe("isUrlCheckinEnabled", () => {
  it("enabled for the pilot processes", () => {
    expect(isUrlCheckinEnabled("y02")).toBe(true);
    expect(isUrlCheckinEnabled("y03")).toBe(true);
    expect(isUrlCheckinEnabled("y04")).toBe(true);
    expect(isUrlCheckinEnabled("y05a")).toBe(true);
    expect(isUrlCheckinEnabled("y05b")).toBe(true);
    expect(isUrlCheckinEnabled("y06")).toBe(true);
    expect(isUrlCheckinEnabled("y07")).toBe(true);
    expect(isUrlCheckinEnabled("y08")).toBe(true);
    expect(isUrlCheckinEnabled("y09")).toBe(true);
    expect(isUrlCheckinEnabled("y10")).toBe(true);
    expect(isUrlCheckinEnabled("y11")).toBe(true);
    expect(isUrlCheckinEnabled("y12")).toBe(true);
    expect(isUrlCheckinEnabled("y13")).toBe(true);
    expect(isUrlCheckinEnabled("y14")).toBe(true);
    expect(isUrlCheckinEnabled("y15")).toBe(true);
    expect(isUrlCheckinEnabled("y16")).toBe(true);
    expect(isUrlCheckinEnabled("y17")).toBe(true);
  });
  it("disabled for every other process", () => {
    expect(isUrlCheckinEnabled("y01")).toBe(false);
    expect(isUrlCheckinEnabled("y18")).toBe(false);
    expect(isUrlCheckinEnabled("")).toBe(false);
  });
});

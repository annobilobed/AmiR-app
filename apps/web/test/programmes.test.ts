import { describe, expect, it } from "vitest";
import { UCC_PROGRAMMES, suggestProgrammes } from "@/lib/programmes";

describe("programme suggestions", () => {
  it("suggests while typing, before the word is finished", () => {
    expect(suggestProgrammes("eco")).toContain("BA Economics");
    expect(suggestProgrammes("eco")[0]).toMatch(/Economics/);
    expect(suggestProgrammes("nurs")).toEqual(["BSc Nursing"]);
  });
  it("matches several words and ignores case and dots", () => {
    expect(suggestProgrammes("comp sci")).toEqual(["BSc Computer Science"]);
    expect(suggestProgrammes("B.Sc. eco")[0]).toBe("BSc Economics");
    expect(suggestProgrammes("bed math")[0]).toBe("BEd Mathematics");
  });
  it("puts subject matches before degree-letter matches", () => {
    // "ba" starts BA programmes but also "Basic Education"; the subject match ranks first
    expect(suggestProgrammes("basic")[0]).toBe("BEd Basic Education");
  });
  it("returns nothing for an empty or unknown entry, and caps the list", () => {
    expect(suggestProgrammes("")).toEqual([]);
    expect(suggestProgrammes("zzzz")).toEqual([]);
    expect(suggestProgrammes("b").length).toBeLessThanOrEqual(8);
  });
  it("has no duplicate programmes", () => {
    expect(new Set(UCC_PROGRAMMES).size).toBe(UCC_PROGRAMMES.length);
  });
});

import { describe, expect, it } from "vitest";
import { UCC_RULES as R, duplicateCodes, parseSlip } from "../src";

const L = (text: string, confidence = 92) => ({ text, confidence });

describe("result slip parser", () => {
  it("reads clean rows with code, title, credits and grade", () => {
    const rows = parseSlip(R, [
      L("UNIVERSITY OF CAPE COAST"),
      L("FIRST SEMESTER 2024/2025"),
      L("ECO 201  Intermediate Microeconomics I   3   B+"),
      L("MTH201 Calculus II 3 A"),
      L("COURSE  TITLE  CREDIT  GRADE"),
      L("GPA 3.50  CGPA 3.48"),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ code: "ECO 201", title: "Intermediate Microeconomics I", credits: 3, grade: "B+", issues: [] });
    expect(rows[1]).toMatchObject({ code: "MTH 201", credits: 3, grade: "A" });
  });

  it("repairs common OCR confusions", () => {
    const rows = parseSlip(R, [L("EC0 2O1 Public Finance 3 8+"), L("5TA 2I2 Probability 2 C+")]);
    expect(rows[0]).toMatchObject({ code: "ECO 201", grade: "B+", credits: 3 });
    expect(rows[1]).toMatchObject({ code: "STA 212", grade: "C+", credits: 2 });
  });

  it("flags rows it is unsure about instead of guessing", () => {
    const rows = parseSlip(R, [L("CSC 205 Data Structures 3", 60), L("GST 201 Liberal Studies B")]);
    expect(rows[0]!.issues).toEqual(["low-confidence", "no-grade"]);
    expect(rows[1]!.issues).toEqual(["no-credits"]);
    expect(rows[1]!.grade).toBe("B");
  });

  it("detects courses already in the semester", () => {
    const d = duplicateCodes([{ code: "ECO 201" }, { code: "MTH 201" }], [{ code: "ECO201" }]);
    expect([...d]).toEqual(["ECO 201"]);
  });
});

describe("slip titles", () => {
  it("keeps roman numerals and small words readable", () => {
    const [r] = parseSlip(R, [{ text: "CSC 201 INTRODUCTION TO PROGRAMMING II 3 A", confidence: 95 }]);
    expect(r!.title).toBe("Introduction to Programming II");
  });
});

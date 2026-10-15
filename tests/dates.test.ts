import { describe, expect, it } from "vitest";
import { assessIssueDate, normalizeDateString } from "../shared/dates";

const now = new Date("2026-10-16T12:00:00Z");

describe("normalizeDateString", () => {
  it("keeps ISO dates and drops the time", () => {
    expect(normalizeDateString("2024-02-29")).toBe("2024-02-29");
    expect(normalizeDateString("2024-02-29T10:15:00")).toBe("2024-02-29");
    expect(normalizeDateString(" 2026-03-16 08:00 ")).toBe("2026-03-16");
  });

  it("reads Ukrainian day-first dates", () => {
    expect(normalizeDateString("16.03.2024")).toBe("2024-03-16");
    expect(normalizeDateString("16/03/2024")).toBe("2024-03-16");
  });

  it("rejects impossible and unreadable dates", () => {
    expect(normalizeDateString("2023-02-29")).toBeNull();
    expect(normalizeDateString("2024-13-01")).toBeNull();
    expect(normalizeDateString("31.04.2024")).toBeNull();
    expect(normalizeDateString("2024-00-10")).toBeNull();
    expect(normalizeDateString("yesterday")).toBeNull();
    expect(normalizeDateString("")).toBeNull();
  });
});

describe("assessIssueDate", () => {
  it("accepts dates from 1991 through 7 days ahead", () => {
    expect(assessIssueDate("1991-01-01", now)).toBe("ok");
    expect(assessIssueDate("2026-10-16", now)).toBe("ok");
    expect(assessIssueDate("2026-10-23", now)).toBe("ok");
    expect(assessIssueDate("16.10.2026", now)).toBe("ok");
  });

  it("flags missing, unreadable, and implausible dates", () => {
    expect(assessIssueDate(null, now)).toBe("missing");
    expect(assessIssueDate("   ", now)).toBe("missing");
    expect(assessIssueDate("not a date", now)).toBe("invalid");
    expect(assessIssueDate("1990-12-31", now)).toBe("implausible");
    expect(assessIssueDate("2026-10-24", now)).toBe("implausible");
  });
});

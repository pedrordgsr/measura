import { describe, expect, it } from "vitest";
import { formatCell } from "./format";

describe("formatCell", () => {
  it("uses pt-BR number formatting", () => {
    expect(formatCell(7000, "int64")).toBe("7.000");
    expect(formatCell(449.5, "double")).toBe("449,5");
    expect(formatCell("1299.90", "decimal")).toBe("1.299,9");
  });

  it("formats dates as dd/mm/yyyy", () => {
    expect(formatCell("2025-01-05", "dateTime")).toBe("05/01/2025");
    expect(formatCell("2025-01-05 13:30:00", "dateTime")).toBe("05/01/2025 13:30:00");
  });

  it("shows BLANK as an empty cell", () => {
    expect(formatCell(null, "string")).toBe("");
  });
});

import { describe, expect, it } from "vitest";
import { detectLocale } from "../i18n";
import { formatCell } from "./format";

describe("formatCell", () => {
  it("formats numbers for the locale", () => {
    expect(formatCell(7000, "int64", "en-US")).toBe("7,000");
    expect(formatCell(449.5, "double", "en-US")).toBe("449.5");
    expect(formatCell(7000, "int64", "pt-BR")).toBe("7.000");
    expect(formatCell("1299.90", "decimal", "pt-BR")).toBe("1.299,9");
  });

  it("formats dates for the locale", () => {
    expect(formatCell("2025-01-05", "dateTime", "en-US")).toBe("1/5/2025");
    expect(formatCell("2025-01-05", "dateTime", "pt-BR")).toBe("05/01/2025");
    expect(formatCell("2025-01-05 13:30:00", "dateTime", "en-US")).toBe("1/5/2025 1:30:00 PM");
    expect(formatCell("2025-01-05 13:30:00", "dateTime", "pt-BR")).toBe("05/01/2025 13:30:00");
  });

  it("translates booleans", () => {
    expect(formatCell(true, "boolean", "en-US")).toBe("True");
    expect(formatCell(false, "boolean", "pt-BR")).toBe("Falso");
  });

  it("shows BLANK as an empty cell", () => {
    expect(formatCell(null, "string", "en-US")).toBe("");
  });
});

describe("detectLocale", () => {
  it("defaults to English and recognizes Portuguese", () => {
    expect(detectLocale(undefined)).toBe("en-US");
    expect(detectLocale("fr-FR")).toBe("en-US");
    expect(detectLocale("pt-BR")).toBe("pt-BR");
    expect(detectLocale("pt-PT")).toBe("pt-BR");
  });
});

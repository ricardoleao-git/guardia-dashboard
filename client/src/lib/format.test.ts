import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatTime, timeAgo, truncateMiddle } from "./format";

describe("formatDate", () => {
  it("formata para dd/mm/yyyy", () => {
    expect(formatDate("2026-01-05T00:00:00Z")).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});

describe("formatTime", () => {
  it("formata para hh:mm:ss", () => {
    expect(formatTime("2026-01-05T10:30:00Z")).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
});

describe("formatDateTime", () => {
  it("combina data e hora", () => {
    const result = formatDateTime("2026-01-05T10:30:00Z");
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}/);
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}$/);
  });
});

describe("timeAgo", () => {
  it("retorna 'agora mesmo' para instantes recentes", () => {
    expect(timeAgo(new Date().toISOString())).toBe("agora mesmo");
  });

  it("retorna minutos para eventos de alguns minutos atrás", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(fiveMinAgo)).toBe("há 5 min");
  });

  it("retorna horas para eventos de mais de uma hora atrás", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(threeHoursAgo)).toBe("há 3h");
  });

  it("retorna dias para eventos de mais de um dia atrás", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(twoDaysAgo)).toBe("há 2d");
  });
});

describe("truncateMiddle", () => {
  it("mantém strings curtas intactas", () => {
    expect(truncateMiddle("abc", 20)).toBe("abc");
  });

  it("trunca o meio de strings longas preservando início e fim", () => {
    const long = "a".repeat(30);
    const result = truncateMiddle(long, 20);
    expect(result).toContain("...");
    expect(result.startsWith("a")).toBe(true);
    expect(result.endsWith("a")).toBe(true);
  });
});

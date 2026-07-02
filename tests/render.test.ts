import { describe, expect, it } from "vitest";
import { formatCursorUsageDetails, renderCursorStatus } from "../src/render.js";

const theme = {
  fg: (_role: string, text: string) => text,
} as Parameters<typeof renderCursorStatus>[1];

describe("renderCursorStatus", () => {
  it("includes total, auto, and api percentages", () => {
    const rendered = renderCursorStatus(
      {
        totalPercentUsed: 71.3,
        autoPercentUsed: 92.7,
        apiPercentUsed: 0.2,
        source: "dashboard-api",
      },
      theme,
    );

    expect(rendered).toContain("71.3%");
    expect(rendered).toContain("92.7%");
    expect(rendered).toContain("0.2%");
    expect(rendered).toContain("Auto");
    expect(rendered).toContain("API");
  });
});

describe("formatCursorUsageDetails", () => {
  it("formats multiline details", () => {
    const text = formatCursorUsageDetails({
      totalPercentUsed: 71,
      autoPercentUsed: 92,
      apiPercentUsed: 0,
      source: "dashboard-api",
      email: "user@example.com",
    });

    expect(text).toContain("Total: 71%");
    expect(text).toContain("Auto + Composer: 92%");
    expect(text).toContain("API: 0%");
    expect(text).toContain("user@example.com");
  });
});

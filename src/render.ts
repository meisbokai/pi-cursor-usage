import { colorForPercentage } from "./lib/usage-extension.js";
import type { Theme } from "./lib/usage-extension.js";
import type { CursorUsageData } from "./types.js";

function formatPercent(value: number): string {
  return `${value}%`;
}

/** Render Cursor usage into a compact pi footer string. */
export function renderCursorStatus(data: CursorUsageData, theme: Theme): string {
  const totalColor = colorForPercentage(data.totalPercentUsed, theme);
  const autoColor = colorForPercentage(data.autoPercentUsed, theme);
  const apiColor = colorForPercentage(data.apiPercentUsed, theme);

  const prefix = theme.fg("muted", "Cursor:");
  const total = totalColor(formatPercent(data.totalPercentUsed));
  const auto = theme.fg("dim", "Auto ");
  const autoVal = autoColor(formatPercent(data.autoPercentUsed));
  const api = theme.fg("dim", " API ");
  const apiVal = apiColor(formatPercent(data.apiPercentUsed));

  return `${prefix}${total} ${auto}${autoVal}${api}${apiVal}`;
}

/** Longer status for /cursor-usage command output. */
export function formatCursorUsageDetails(data: CursorUsageData): string {
  const lines = [
    `Total: ${data.totalPercentUsed}%`,
    `Auto + Composer: ${data.autoPercentUsed}%`,
    `API: ${data.apiPercentUsed}%`,
    `Source: ${data.source}`,
  ];
  if (data.email) lines.push(`Account: ${data.email}`);
  if (data.billingCycleEnd) {
    lines.push(`Cycle ends: ${new Date(data.billingCycleEnd).toLocaleString()}`);
  }
  return lines.join("\n");
}

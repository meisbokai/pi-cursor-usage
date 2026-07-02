import { createUsageExtension } from "./lib/usage-extension.js";
import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { getCursorUsage } from "./api.js";
import { formatCursorUsageDetails, renderCursorStatus } from "./render.js";

const extension = createUsageExtension({
  providerPrefix: "cursor",
  statusKey: "cursor-usage",
  label: "Cursor",
  cooldownMs: 60_000,
  fetchUsage: getCursorUsage,
  renderStatus: renderCursorStatus,
});

export default function registerCursorUsageExtension(pi: Parameters<typeof extension>[0]) {
  extension(pi);

  pi.registerCommand("cursor-usage", {
    description: "Show Cursor Auto+Composer and API usage percentages",
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      try {
        const data = await getCursorUsage(ctx.modelRegistry);
        ctx.ui.notify(formatCursorUsageDetails(data), "info");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ctx.ui.notify(message, "error");
      }
    },
  });
}

export { getCursorUsage, renderCursorStatus, formatCursorUsageDetails };

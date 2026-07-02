import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { UsageError } from "./errors.js";

export type Theme = ExtensionContext["ui"]["theme"];

export function colorForPercentage(percentage: number, theme: Theme) {
  if (percentage >= 90) return (text: string) => theme.fg("error", text);
  if (percentage > 80) return (text: string) => theme.fg("warning", text);
  return (text: string) => theme.fg("accent", text);
}

function defaultRenderError(label: string) {
  return (error: unknown, theme: Theme): string => {
    const code = error instanceof UsageError ? error.code : "fetch";
    return theme.fg("muted", `${label}:`) + theme.fg("error", `<err:${code}>`);
  };
}

type FetchUsageFn<TData> = (
  modelRegistry: ExtensionContext["modelRegistry"],
) => Promise<TData>;

export class UsageCache<TData> {
  private lastData: TData | null = null;
  private lastFetchTime = 0;

  constructor(
    private readonly statusKey: string,
    label: string,
    private readonly fetchUsage: FetchUsageFn<TData>,
    private readonly renderStatus: (data: TData, theme: Theme) => string,
    private readonly renderError = defaultRenderError(label),
    private readonly cooldownMs = 30_000,
  ) {}

  async updateStatus(ctx: ExtensionContext): Promise<void> {
    try {
      const now = Date.now();
      if (this.lastData && now - this.lastFetchTime < this.cooldownMs) {
        ctx.ui.setStatus(this.statusKey, this.renderStatus(this.lastData, ctx.ui.theme));
        return;
      }

      const data = await this.fetchUsage(ctx.modelRegistry);
      this.lastData = data;
      this.lastFetchTime = now;
      ctx.ui.setStatus(this.statusKey, this.renderStatus(data, ctx.ui.theme));
    } catch (error) {
      ctx.ui.setStatus(this.statusKey, this.renderError(error, ctx.ui.theme));
    }
  }

  clear(ctx: ExtensionContext): void {
    ctx.ui.setStatus(this.statusKey, undefined);
  }
}

function isProviderMatch(provider: string | undefined, prefix: string): boolean {
  return provider?.toLowerCase().startsWith(prefix) ?? false;
}

function isCurrentProvider(ctx: ExtensionContext, prefix: string): boolean {
  return isProviderMatch(ctx.model?.provider, prefix);
}

export interface UsageExtensionConfig<TData> {
  providerPrefix: string;
  statusKey: string;
  label: string;
  cooldownMs?: number;
  fetchUsage: FetchUsageFn<TData>;
  renderStatus: (data: TData, theme: Theme) => string;
  renderError?: (error: unknown, theme: Theme) => string;
}

export function createUsageExtension<TData>(config: UsageExtensionConfig<TData>) {
  const { providerPrefix, statusKey, label, cooldownMs = 30_000 } = config;

  return function extension(pi: ExtensionAPI) {
    const cache = new UsageCache(
      statusKey,
      label,
      config.fetchUsage,
      config.renderStatus,
      config.renderError,
      cooldownMs,
    );

    pi.on("session_start", async (_event, ctx) => {
      if (isCurrentProvider(ctx, providerPrefix)) {
        await cache.updateStatus(ctx);
      }
    });

    pi.on("model_select", async (event, ctx) => {
      if (isProviderMatch(event.model.provider, providerPrefix)) {
        await cache.updateStatus(ctx);
      } else {
        cache.clear(ctx);
      }
    });

    pi.on("turn_end", async (_event, ctx) => {
      if (isCurrentProvider(ctx, providerPrefix)) {
        await cache.updateStatus(ctx);
      }
    });

    pi.on("session_shutdown", async (_event, ctx) => {
      cache.clear(ctx);
    });
  };
}

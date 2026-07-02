import { UsageError, safeFetch, safeParseJson } from "./lib/errors.js";
import {
  basicAuthHeader,
  loadCursorAuth,
  refreshAccessToken,
  resolveAdminApiKeyAsync,
  resolveUsageMode,
} from "./auth.js";
import {
  getTeamMemberSpendList,
  pickTeamMember,
  resolveFromPlanUsage,
  resolveFromTeamMemberSpend,
} from "./percentages.js";
import type {
  AdminSpendResponse,
  CursorUsageData,
  GetCurrentPeriodUsageResponse,
} from "./types.js";

const ADMIN_SPEND_URL = "https://api.cursor.com/teams/spend";
const DASHBOARD_USAGE_URL =
  "https://api2.cursor.sh/aiserver.v1.DashboardService/GetCurrentPeriodUsage";

function usageErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }
  return undefined;
}

export async function fetchAdminSpendUsage(
  apiKey: string,
  preferredEmail?: string,
): Promise<CursorUsageData> {
  const response = await safeFetch(ADMIN_SPEND_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(apiKey),
      "Content-Type": "application/json",
      "Accept-Encoding": "identity",
    },
    body: JSON.stringify({
      searchTerm: preferredEmail ?? undefined,
      page: 1,
      pageSize: 100,
    }),
  });

  const parsed = (await safeParseJson(response)) as AdminSpendResponse;
  const members = getTeamMemberSpendList(parsed);
  const member = pickTeamMember(members, preferredEmail);

  if (!member) {
    if (members.length > 1) {
      throw new UsageError(
        "Multiple team members returned. Set CURSOR_USAGE_EMAIL to select your account.",
        "multiuser",
      );
    }
    throw new UsageError("No team member spend data returned", "nodata");
  }

  const percents = resolveFromTeamMemberSpend(member);
  return {
    ...percents,
    source: "admin-api",
    email: member.email,
    billingCycleEnd: parsed.subscriptionCycleStart,
  };
}

async function fetchDashboardUsageWithToken(
  accessToken: string,
  email?: string,
): Promise<CursorUsageData> {
  const response = await safeFetch(DASHBOARD_USAGE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Connect-Protocol-Version": "1",
      "Accept-Encoding": "identity",
    },
    body: "{}",
  });

  const parsed = (await safeParseJson(response)) as GetCurrentPeriodUsageResponse;
  const planUsage = parsed.planUsage;
  if (!planUsage) {
    throw new UsageError("planUsage missing from dashboard response", "nodata");
  }

  const percents = resolveFromPlanUsage(planUsage);
  const billingCycleEnd = parsed.billingCycleEnd
    ? Number(parsed.billingCycleEnd)
    : undefined;

  return {
    ...percents,
    source: "dashboard-api",
    email,
    billingCycleEnd: Number.isFinite(billingCycleEnd) ? billingCycleEnd : undefined,
  };
}

export async function fetchDashboardUsage(): Promise<CursorUsageData> {
  const auth = loadCursorAuth();
  if (!auth?.accessToken) {
    throw new UsageError(
      "Cursor session not found. Sign in to Cursor Desktop or set CURSOR_ADMIN_API_KEY.",
      "noauth",
    );
  }

  try {
    return await fetchDashboardUsageWithToken(auth.accessToken, auth.email);
  } catch (error) {
    if (usageErrorCode(error) === "http401" && auth.refreshToken) {
      const refreshed = await refreshAccessToken(auth.refreshToken);
      if (refreshed) {
        return await fetchDashboardUsageWithToken(refreshed, auth.email);
      }
      throw new UsageError("Cursor access token expired. Re-open Cursor Desktop.", "expired");
    }
    throw error;
  }
}

export async function getCursorUsage(
  modelRegistry: { getApiKeyForProvider: (provider: string) => Promise<string | undefined> },
): Promise<CursorUsageData> {
  const mode = resolveUsageMode();
  const preferredEmail =
    process.env.CURSOR_USAGE_EMAIL?.trim() || loadCursorAuth()?.email;

  if (mode === "admin") {
    const apiKey = await resolveAdminApiKeyAsync(modelRegistry.getApiKeyForProvider);
    if (!apiKey) {
      throw new UsageError(
        "CURSOR_ADMIN_API_KEY is required for admin mode.",
        "noauth",
      );
    }
    return fetchAdminSpendUsage(apiKey, preferredEmail);
  }

  if (mode === "dashboard") {
    return fetchDashboardUsage();
  }

  // auto: prefer admin key when configured, otherwise dashboard session.
  const apiKey = await resolveAdminApiKeyAsync(modelRegistry.getApiKeyForProvider);
  if (apiKey) {
    try {
      return await fetchAdminSpendUsage(apiKey, preferredEmail);
    } catch (error) {
      const code = usageErrorCode(error);
      if (code === "http401" || code === "http403") {
        // Fall through to dashboard auth.
      } else {
        throw error;
      }
    }
  }

  return fetchDashboardUsage();
}

export { UsageError } from "./lib/errors.js";

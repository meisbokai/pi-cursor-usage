import type { PlanUsage, TeamMemberSpend } from "./types.js";

/** Round to one decimal place for display parity with the Cursor portal. */
export function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Resolve usage percentages from explicit API fields or included spend/limit.
 *
 * Cursor returns `autoPercentUsed`, `apiPercentUsed`, and `totalPercentUsed`
 * directly on tiered plans. When absent, derive total from included spend.
 */
export function resolvePercentages(input: {
  autoPercentUsed?: unknown;
  apiPercentUsed?: unknown;
  totalPercentUsed?: unknown;
  includedSpendCents?: unknown;
  limitCents?: unknown;
  includedSpend?: unknown;
  limit?: unknown;
}): { autoPercentUsed: number; apiPercentUsed: number; totalPercentUsed: number } {
  const auto = finiteNumber(input.autoPercentUsed) ?? 0;
  const api = finiteNumber(input.apiPercentUsed) ?? 0;

  let total = finiteNumber(input.totalPercentUsed);
  if (total === undefined) {
    const included =
      finiteNumber(input.includedSpendCents) ?? finiteNumber(input.includedSpend);
    const limit = finiteNumber(input.limitCents) ?? finiteNumber(input.limit);
    if (included !== undefined && limit !== undefined && limit > 0) {
      total = (included / limit) * 100;
    } else {
      // Weighted fallback when only pool percentages exist.
      total = Math.max(auto, api);
    }
  }

  return {
    autoPercentUsed: roundPercent(auto),
    apiPercentUsed: roundPercent(api),
    totalPercentUsed: roundPercent(total),
  };
}

export function resolveFromPlanUsage(planUsage: PlanUsage) {
  return resolvePercentages({
    autoPercentUsed: planUsage.autoPercentUsed,
    apiPercentUsed: planUsage.apiPercentUsed,
    totalPercentUsed: planUsage.totalPercentUsed,
    includedSpend: planUsage.includedSpend,
    limit: planUsage.limit,
  });
}

export function resolveFromTeamMemberSpend(member: TeamMemberSpend) {
  return resolvePercentages({
    autoPercentUsed: member.autoPercentUsed,
    apiPercentUsed: member.apiPercentUsed,
    totalPercentUsed: member.totalPercentUsed,
    includedSpendCents: member.includedSpendCents,
  });
}

export function pickTeamMember(
  members: TeamMemberSpend[],
  preferredEmail?: string,
): TeamMemberSpend | undefined {
  if (members.length === 0) return undefined;
  if (preferredEmail) {
    const match = members.find(
      (m) => m.email?.toLowerCase() === preferredEmail.toLowerCase(),
    );
    if (match) return match;
  }
  if (members.length === 1) return members[0];
  return undefined;
}

export function getTeamMemberSpendList(response: {
  teamMemberSpend?: TeamMemberSpend[];
  spend?: TeamMemberSpend[];
}): TeamMemberSpend[] {
  return response.teamMemberSpend ?? response.spend ?? [];
}

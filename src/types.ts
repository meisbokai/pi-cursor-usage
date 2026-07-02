export interface CursorUsageData {
  /** Combined included usage percentage (matches portal "Total"). */
  totalPercentUsed: number;
  /** Auto + Composer pool usage percentage. */
  autoPercentUsed: number;
  /** API pool usage percentage. */
  apiPercentUsed: number;
  /** Where the data came from. */
  source: "admin-api" | "dashboard-api";
  /** Account email when known. */
  email?: string;
  /** Billing cycle end (epoch ms) when available. */
  billingCycleEnd?: number;
}

export interface PlanUsage {
  totalSpend?: number;
  includedSpend?: number;
  bonusSpend?: number;
  remaining?: number;
  limit?: number;
  autoPercentUsed?: number;
  apiPercentUsed?: number;
  totalPercentUsed?: number;
}

export interface GetCurrentPeriodUsageResponse {
  billingCycleStart?: string;
  billingCycleEnd?: string;
  planUsage?: PlanUsage;
}

export interface TeamMemberSpend {
  userId?: number | string;
  name?: string;
  email?: string;
  role?: string;
  spendCents?: number;
  overallSpendCents?: number;
  includedSpendCents?: number;
  autoPercentUsed?: number;
  apiPercentUsed?: number;
  totalPercentUsed?: number;
  billingTier?: string;
}

export interface AdminSpendResponse {
  teamMemberSpend?: TeamMemberSpend[];
  spend?: TeamMemberSpend[];
  subscriptionCycleStart?: number;
  totalMembers?: number;
  totalPages?: number;
}

export type UsageMode = "auto" | "admin" | "dashboard";

export interface CursorAuthRecord {
  accessToken?: string;
  refreshToken?: string;
  email?: string;
}

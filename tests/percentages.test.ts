import { describe, expect, it } from "vitest";
import {
  getTeamMemberSpendList,
  pickTeamMember,
  resolveFromPlanUsage,
  resolveFromTeamMemberSpend,
  resolvePercentages,
  roundPercent,
} from "../src/percentages.js";

describe("resolvePercentages", () => {
  it("uses explicit API percentages when present", () => {
    expect(
      resolvePercentages({
        autoPercentUsed: 92.666,
        apiPercentUsed: 0.177,
        totalPercentUsed: 71.323,
      }),
    ).toEqual({
      autoPercentUsed: 92.7,
      apiPercentUsed: 0.2,
      totalPercentUsed: 71.3,
    });
  });

  it("derives total from included spend and limit", () => {
    expect(
      resolvePercentages({
        includedSpend: 1500,
        limit: 2000,
      }),
    ).toEqual({
      autoPercentUsed: 0,
      apiPercentUsed: 0,
      totalPercentUsed: 75,
    });
  });
});

describe("resolveFromPlanUsage", () => {
  it("maps dashboard planUsage fields", () => {
    expect(
      resolveFromPlanUsage({
        autoPercentUsed: 92,
        apiPercentUsed: 0,
        totalPercentUsed: 71,
      }),
    ).toEqual({
      autoPercentUsed: 92,
      apiPercentUsed: 0,
      totalPercentUsed: 71,
    });
  });
});

describe("resolveFromTeamMemberSpend", () => {
  it("maps admin API member fields", () => {
    expect(
      resolveFromTeamMemberSpend({
        email: "dev@example.com",
        autoPercentUsed: 50,
        apiPercentUsed: 10,
        totalPercentUsed: 35,
      }),
    ).toEqual({
      autoPercentUsed: 50,
      apiPercentUsed: 10,
      totalPercentUsed: 35,
    });
  });
});

describe("pickTeamMember", () => {
  const members = [
    { email: "a@example.com", autoPercentUsed: 1 },
    { email: "b@example.com", autoPercentUsed: 2 },
  ];

  it("selects by email when provided", () => {
    expect(pickTeamMember(members, "b@example.com")?.autoPercentUsed).toBe(2);
  });

  it("returns sole member without email", () => {
    expect(pickTeamMember([members[0]!])?.email).toBe("a@example.com");
  });

  it("returns undefined for ambiguous teams", () => {
    expect(pickTeamMember(members)).toBeUndefined();
  });
});

describe("getTeamMemberSpendList", () => {
  it("accepts both documented and observed response keys", () => {
    expect(getTeamMemberSpendList({ teamMemberSpend: [{ email: "a@x.com" }] })).toHaveLength(1);
    expect(getTeamMemberSpendList({ spend: [{ email: "b@x.com" }] })).toHaveLength(1);
  });
});

describe("roundPercent", () => {
  it("rounds to one decimal", () => {
    expect(roundPercent(92.666666)).toBe(92.7);
  });
});

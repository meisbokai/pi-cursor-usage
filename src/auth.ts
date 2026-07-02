import { homedir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { CursorAuthRecord } from "./types.js";

const AUTH_KEYS = {
  accessToken: "cursorAuth/accessToken",
  refreshToken: "cursorAuth/refreshToken",
  email: "cursorAuth/cachedEmail",
} as const;

/** Candidate paths for Cursor Desktop global state (platform-specific). */
export function getCursorStateDbPaths(home = homedir()): string[] {
  return [
    join(home, ".config", "Cursor", "User", "globalStorage", "state.vscdb"),
    join(home, "Library", "Application Support", "Cursor", "User", "globalStorage", "state.vscdb"),
    join(home, "AppData", "Roaming", "Cursor", "User", "globalStorage", "state.vscdb"),
  ];
}

export function readCursorAuthFromDb(dbPath: string): CursorAuthRecord | undefined {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const read = (key: string): string | undefined => {
      const row = db.prepare("SELECT value FROM ItemTable WHERE key = ?").get(key) as
        | { value?: string }
        | undefined;
      const value = row?.value;
      return typeof value === "string" && value.length > 0 ? value : undefined;
    };

    const accessToken = read(AUTH_KEYS.accessToken);
    if (!accessToken) return undefined;

    return {
      accessToken,
      refreshToken: read(AUTH_KEYS.refreshToken),
      email: read(AUTH_KEYS.email),
    };
  } finally {
    db.close();
  }
}

export function loadCursorAuth(home = homedir()): CursorAuthRecord | undefined {
  for (const dbPath of getCursorStateDbPaths(home)) {
    try {
      const auth = readCursorAuthFromDb(dbPath);
      if (auth?.accessToken) return auth;
    } catch {
      // Try next path.
    }
  }
  return undefined;
}

export function resolveUsageMode(): "admin" | "dashboard" {
  const mode = process.env.CURSOR_USAGE_MODE?.toLowerCase();
  if (mode === "admin") return "admin";
  if (mode === "dashboard") return "dashboard";
  if (process.env.CURSOR_ADMIN_API_KEY?.trim()) return "admin";
  return "dashboard";
}

export function resolveAdminApiKey(): string | undefined {
  const fromEnv = process.env.CURSOR_ADMIN_API_KEY?.trim();
  if (fromEnv) return fromEnv;

  const cursorApiKey = process.env.CURSOR_API_KEY?.trim();
  if (cursorApiKey && process.env.CURSOR_USAGE_MODE === "admin") return cursorApiKey;

  return undefined;
}

export async function resolveAdminApiKeyAsync(
  getApiKeyForProvider?: (provider: string) => Promise<string | undefined>,
): Promise<string | undefined> {
  const direct = resolveAdminApiKey();
  if (direct) return direct;

  if (getApiKeyForProvider && process.env.CURSOR_USAGE_MODE === "admin") {
    const key = await getApiKeyForProvider("cursor");
    return key?.trim() || undefined;
  }

  return undefined;
}

export function basicAuthHeader(apiKey: string): string {
  const encoded = Buffer.from(`${apiKey}:`, "utf8").toString("base64");
  return `Basic ${encoded}`;
}

const CURSOR_OAUTH_CLIENT_ID = "KbZUR41cY7W6zRSdpSUJ7I7mLYBKOCmB";

export async function refreshAccessToken(refreshToken: string): Promise<string | undefined> {
  const response = await fetch("https://api2.cursor.sh/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept-Encoding": "identity" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: CURSOR_OAUTH_CLIENT_ID,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) return undefined;
  const data = (await response.json()) as { access_token?: string };
  return typeof data.access_token === "string" ? data.access_token : undefined;
}

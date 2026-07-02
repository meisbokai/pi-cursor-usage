# pi-cursor-usage

Pi extension that shows **Cursor subscription usage** in the footer when you use the Cursor provider — matching the Cursor portal's **Total**, **Auto + Composer**, and **API** percentages.

## Install

```bash
pi install git:github.com/meisbokai/pi-cursor-usage
```

Or for local development:

```bash
pi install /path/to/pi-cursor-usage
```

## Usage

When your active model provider is `cursor`, the footer shows something like:

```text
Cursor:71.3% Auto 92.7% API 0.2%
```

Run `/cursor-usage` for a detailed breakdown.

## Authentication

The extension supports two data sources.

### Dashboard API (default for Pro/Ultra/Team)

Reads your Cursor Desktop session from the local SQLite database and calls:

`POST https://api2.cursor.sh/aiserver.v1.DashboardService/GetCurrentPeriodUsage`

**Requirements:**

- Signed in to Cursor Desktop on the same machine
- No extra configuration for most individual Pro accounts

This is the same source that powers the usage panel in the Cursor web portal (`Auto + Composer` and `API` pools).

### Admin API (teams with API keys)

Uses the [Cursor Admin API](https://cursor.com/docs/account/teams/admin-api#get-spending-data):

`POST https://api.cursor.com/teams/spend`

**Requirements:**

- Admin API key from [cursor.com/dashboard → API Keys](https://cursor.com/dashboard)
- Set `CURSOR_ADMIN_API_KEY` in your environment

The response includes `autoPercentUsed`, `apiPercentUsed`, and `totalPercentUsed` for tiered self-serve teams. When those fields are missing, total usage is derived from `includedSpendCents` against plan limits when available.

## Environment variables

| Variable | Description |
|----------|-------------|
| `CURSOR_ADMIN_API_KEY` | Admin API key (Basic auth). Enables admin mode in `auto`. |
| `CURSOR_USAGE_MODE` | `auto` (default), `admin`, or `dashboard` |
| `CURSOR_USAGE_EMAIL` | Email filter when admin API returns multiple team members |

## Percentages

| Metric | Meaning |
|--------|---------|
| **Total** | Combined included usage for the billing cycle |
| **Auto + Composer** | Usage from Auto mode and Composer |
| **API** | Third-party / API pool usage |

Values come directly from Cursor when available (`autoPercentUsed`, `apiPercentUsed`, `totalPercentUsed`). Otherwise total is calculated from included spend ÷ plan limit.

## Development

```bash
npm install
npm run build
npm test
pi -e ./dist/index.js
```

## License

MIT

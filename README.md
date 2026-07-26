# Kimai for Raycast

Track time in [Kimai](https://www.kimai.org) without leaving Raycast.

## Commands

| Command | Mode | What it does |
| --- | --- | --- |
| **Running Timer** | menu bar | Shows the running timer and its elapsed time; stop it from the menu. Refreshes every minute. |
| **Start Timer** | view | Pick project + activity, add a description and tags. Remembers your last choice. |
| **Stop Timer** | no view | Stops every running timer, no UI. |
| **Timesheets** | view | Browse and search entries, grouped by day. Stop, restart, duplicate, edit, delete. |
| **Browse Projects** | view | Customers → projects → activities, with "Start Timer" on every activity. |
| **Time Report** | view | Totals per project for today, this week, or this month. |

## Setup

1. In Kimai, go to **User → API Access** and create an API token.
2. On first run, Raycast asks for:
   - **Kimai URL** — e.g. `https://kimai.example.com` (without `/api`)
   - **API Token** — the token from step 1

Kimai requires HTTPS for API calls.

## Development

```sh
bun install
bun run check      # helper self-check (date/duration formatting)
bun run lint
bun run build
bun run dev        # loads the extension into Raycast
```

`src/kimai.ts` is the only place that talks to the network. `src/format.ts` holds the pure
helpers so they stay testable outside Raycast.

### One gotcha worth knowing

Kimai *returns* ISO 8601 timestamps but *expects* HTML5 local date-time (`yyyy-MM-ddTHH:mm:ss`,
no timezone) on POST/PATCH. `toKimaiDate()` handles this — sending a plain ISO string shifts every
entry by your UTC offset.

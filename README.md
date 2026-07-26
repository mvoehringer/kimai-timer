# Kimai Timer for Raycast

Track time in [Kimai](https://www.kimai.org) without leaving Raycast.

## Commands

| Command | Mode | What it does |
| --- | --- | --- |
| **Running Timer** | menu bar | Running timer with live `h:mm:ss`, pause/stop, and the last 4 tasks to continue. Refreshes every 10s. |
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

Kimai requires HTTPS for API calls. A trailing `/api` in the URL is stripped automatically.

## Behaviour worth knowing

- **One timer at a time.** Starting or continuing a task stops whatever was running before,
  regardless of how the Kimai server itself is configured.
- **Pause is a stop plus a bookmark.** Kimai has no pause endpoint, so pausing stops the entry
  and pins it under "Paused" for a one-click resume. Resuming creates a new entry via
  `/timesheets/{id}/restart` — the paused time stays booked, it is not overwritten.
- **10-second refresh.** That is Raycast's minimum background interval and the reason the
  menu bar can show seconds at all. Raise `interval` in `package.json` if battery life matters
  more to you than a live clock.
- **"Continue" lists distinct tasks.** Project *and* activity *and* description, so two pieces
  of work on the same project stay separate entries. Kimai's own `/timesheets/recent` merges
  them, which is why the list is built from `/timesheets`.

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

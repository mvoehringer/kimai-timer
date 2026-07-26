# Kimai Timer for Raycast

Track time in [Kimai](https://www.kimai.org) without leaving Raycast.

## Commands

| Command | Mode | What it does |
| --- | --- | --- |
| **Running Timer** | menu bar | Elapsed time in the status bar, live `h:mm:ss` in the open menu, stop, last 4 tasks to continue. |
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

## Language

German and English. The language follows your system locale — there is no setting, because
Raycast has no localisation layer and officially supports US English only. All texts live in
`src/i18n.ts`: the English dictionary defines the shape, the German one is typed against it,
so a missing key is a compile error rather than an untranslated string at runtime.

Command names, descriptions and preference labels stay English — they come from
`package.json`, which Raycast reads before any code runs.

## Behaviour worth knowing

- **One timer at a time.** Starting or continuing a task stops whatever was running before,
  regardless of how the Kimai server itself is configured.
- **No pause, by design.** Kimai models an entry as `begin` + `end` and has no paused state.
  A pause would either book the break as work (by backdating `begin`) or be nothing more than
  a stop. So: stop the timer, and start it again from "Continue" — each stretch of work stays
  a separate, truthful entry.
- **The menu bar command uses HUDs, not toasts.** Raycast throws
  `Toast API is not available when command is launched in background` if a menu item action
  runs in a menu that was rendered by a background refresh — which is the normal case. Every
  other command is user-initiated and keeps toasts.
- **Seconds live in the menu, not the status bar.** The status bar title only changes on
  background refresh (every minute), so it shows `h:mm` — a seconds display there would be
  stale. Open the menu and the elapsed time ticks once a second. Colour works the same way:
  the status bar icon stays a template image, colour is used inside the menu.
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

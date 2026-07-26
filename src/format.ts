/** Pure helpers — no Raycast imports, so they stay runnable in `bun run scripts/check.ts`. */

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Normalises whatever ends up in the "Kimai URL" preference to the instance root,
 * because `/api` is appended per request. Handles the four things people actually
 * paste: a bare hostname, a trailing slash, the API root, and the API docs URL.
 * A URL ending in `/api` is the most common cause of a blanket 404.
 */
export function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim();
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return withScheme.replace(/\/+$/, "").replace(/\/api(\/doc)?$/i, "");
}

/**
 * Kimai returns ISO 8601 but expects HTML5 "local date and time" on POST/PATCH:
 * `yyyy-MM-ddTHH:mm:ss` with no timezone. Sending a real ISO string here shifts
 * every entry by the UTC offset.
 */
export function toKimaiDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Seconds → `1:05:03` for running timers, `1:05` under an hour. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

/**
 * Seconds → `1:02` (h:mm). For the menu bar, which only refreshes once a minute —
 * a ticking seconds display there would just be wrong most of the time.
 */
export function formatClock(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60);
  return `${Math.floor(m / 60)}:${pad(m % 60)}`;
}

/** Seconds → `2h 15m`, for totals where seconds are noise. */
export function formatTotal(seconds: number): string {
  const h = Math.floor(Math.max(0, seconds) / 3600);
  const m = Math.round((Math.max(0, seconds) % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function startOfDay(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Monday-based, matching Kimai's default week start in Europe. */
export function startOfWeek(d = new Date()): Date {
  const start = startOfDay(d);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

export function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfDay(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
}

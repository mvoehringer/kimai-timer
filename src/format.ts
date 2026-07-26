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

export interface TaskLike {
  begin: string;
  end?: string | null;
  description?: string | null;
  project?: { id: number } | null;
  activity?: { id: number } | null;
}

/**
 * What makes two entries "the same task": project, activity AND description. Kimai's own
 * `/timesheets/recent` keys on project + activity only, which merges two different pieces
 * of work on the same project into one entry.
 */
export function taskKey(entry: TaskLike): string {
  return [
    entry.project?.id ?? "?",
    entry.activity?.id ?? "?",
    entry.description?.trim().toLowerCase() ?? "",
  ].join("|");
}

/** The newest finished entry per distinct task, most recent first. */
export function recentTasks<T extends TaskLike>(
  entries: T[],
  count: number,
): T[] {
  const sorted = [...entries].sort(
    (a, b) => Date.parse(b.begin) - Date.parse(a.begin),
  );
  const seen = new Set<string>();
  const tasks: T[] = [];

  for (const entry of sorted) {
    // A running entry already has its own section in the menu bar.
    if (!entry.end) continue;
    const key = taskKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    tasks.push(entry);
    if (tasks.length === count) break;
  }

  return tasks;
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
 * Seconds → `0:12` (h:mm) for the menu bar title. No seconds there: the title only
 * updates on background refresh, so a seconds display would show a stale value.
 */
export function formatHm(seconds: number): string {
  const m = Number.isFinite(seconds)
    ? Math.floor(Math.max(0, seconds) / 60)
    : 0;
  return `${Math.floor(m / 60)}:${pad(m % 60)}`;
}

/**
 * Seconds → `0:12:34` (h:mm:ss). Always includes the hour so `1:02` can never be read
 * as one hour two minutes. Used inside the open menu, which ticks once a second.
 */
export function formatClock(seconds: number): string {
  // A paused task stored by an older version has no duration — never render NaN.
  const s = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
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

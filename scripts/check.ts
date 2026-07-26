/** Self-check for the pure helpers: `bun run scripts/check.ts`. No test framework on purpose. */
import assert from "node:assert/strict";
import {
  formatClock,
  formatDuration,
  formatTotal,
  normalizeBaseUrl,
  recentTasks,
  taskKey,
  startOfWeek,
  toKimaiDate,
} from "../src/format";

// Kimai wants local time without a timezone — an ISO string here shifts entries by the UTC offset.
assert.equal(toKimaiDate(new Date(2026, 6, 26, 9, 5, 3)), "2026-07-26T09:05:03");
assert.equal(toKimaiDate(new Date(2026, 0, 1, 0, 0, 0)), "2026-01-01T00:00:00");
assert.match(toKimaiDate(new Date()), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);

// "Continue" list: same project, different activity or description → separate tasks.
const entry = (
  id: number,
  begin: string,
  project: number,
  activity: number,
  description: string | null,
  end: string | null = "2026-07-26T12:00:00+02:00",
) => ({ id, begin, end, description, project: { id: project }, activity: { id: activity } });

const history = [
  entry(1, "2026-07-26T09:00:00+02:00", 10, 20, "Konzeption"),
  entry(2, "2026-07-26T10:00:00+02:00", 10, 21, "Umsetzung"), // same project, other activity
  entry(3, "2026-07-26T11:00:00+02:00", 10, 20, "Review"), // same project+activity, other description
  entry(4, "2026-07-26T08:00:00+02:00", 10, 20, "konzeption "), // duplicate of 1 modulo case/space
  entry(5, "2026-07-26T12:00:00+02:00", 11, 22, null, null), // running → excluded
  entry(6, "2026-07-25T09:00:00+02:00", 12, 23, "Buchhaltung"),
];

assert.deepEqual(
  recentTasks(history, 4).map((e) => e.id),
  [3, 2, 1, 6],
  "newest first, running excluded, case-insensitive duplicate dropped",
);
assert.equal(recentTasks(history, 2).length, 2);
assert.deepEqual(recentTasks([], 4), []);
// Entries missing a project or activity must not merge into one "?|?|" bucket by accident.
assert.notEqual(
  taskKey(entry(7, "2026-07-26T09:00:00+02:00", 10, 20, "A")),
  taskKey(entry(8, "2026-07-26T09:00:00+02:00", 10, 20, "B")),
);

// A URL entered with /api produced 404s on every call — must normalise back to the root.
assert.equal(normalizeBaseUrl("https://kimai.example.com/api"), "https://kimai.example.com");
assert.equal(normalizeBaseUrl("https://kimai.example.com/api/"), "https://kimai.example.com");
assert.equal(normalizeBaseUrl("https://kimai.example.com/API"), "https://kimai.example.com");
assert.equal(normalizeBaseUrl("https://kimai.example.com/api/doc"), "https://kimai.example.com");
assert.equal(normalizeBaseUrl("https://host/kimai/api/doc/"), "https://host/kimai");
// …while leaving a correct URL, a bare hostname and stray whitespace alone.
assert.equal(normalizeBaseUrl("https://kimai.example.com"), "https://kimai.example.com");
assert.equal(normalizeBaseUrl("  kimai.example.com  "), "https://kimai.example.com");
assert.equal(normalizeBaseUrl("http://localhost:8001/"), "http://localhost:8001");
assert.equal(normalizeBaseUrl("https://host/kimai"), "https://host/kimai");
// "api" as part of a real path segment must survive.
assert.equal(normalizeBaseUrl("https://host/rapid"), "https://host/rapid");

assert.equal(formatDuration(0), "0:00");
assert.equal(formatDuration(59), "0:59");
assert.equal(formatDuration(3723), "1:02:03");
assert.equal(formatDuration(-10), "0:00");

// Menu bar: hours and minutes only, seconds truncated (never rounded up).
assert.equal(formatClock(0), "0:00");
assert.equal(formatClock(59), "0:00");
assert.equal(formatClock(60), "0:01");
assert.equal(formatClock(3723), "1:02");
assert.equal(formatClock(-10), "0:00");

assert.equal(formatTotal(0), "0m");
assert.equal(formatTotal(3600 * 2 + 900), "2h 15m");
assert.equal(formatTotal(90), "2m");

// Weeks start on Monday; a Sunday must map back to the Monday before it.
assert.equal(startOfWeek(new Date(2026, 6, 26, 15, 0)).getDate(), 20); // Sun 26 Jul 2026 → Mon 20
assert.equal(startOfWeek(new Date(2026, 6, 20, 15, 0)).getDate(), 20); // Mon stays put

console.log("ok — all helper checks passed");

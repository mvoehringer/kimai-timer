/** Self-check for the pure helpers: `bun run scripts/check.ts`. No test framework on purpose. */
import assert from "node:assert/strict";
import {
  formatClock,
  formatDuration,
  formatTotal,
  normalizeBaseUrl,
  startOfWeek,
  toKimaiDate,
} from "../src/format";

// Kimai wants local time without a timezone — an ISO string here shifts entries by the UTC offset.
assert.equal(toKimaiDate(new Date(2026, 6, 26, 9, 5, 3)), "2026-07-26T09:05:03");
assert.equal(toKimaiDate(new Date(2026, 0, 1, 0, 0, 0)), "2026-01-01T00:00:00");
assert.match(toKimaiDate(new Date()), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);

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

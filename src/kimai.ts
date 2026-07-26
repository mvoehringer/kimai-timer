import { getPreferenceValues } from "@raycast/api";
import { normalizeBaseUrl, toKimaiDate } from "./format";

export interface Customer {
  id: number;
  name: string;
}

export interface Project {
  id: number;
  name: string;
  /** Integer on collection endpoints, expanded object when `full=true`. */
  customer: number | Customer;
}

export interface Activity {
  id: number;
  name: string;
  project: number | null;
}

export interface Timesheet {
  id: number;
  begin: string;
  end?: string | null;
  duration: number;
  description?: string | null;
  tags?: string[];
  billable?: boolean;
  /** Expanded on `/timesheets/active` and on list calls with `full=true`. */
  project: Project;
  activity: Activity;
}

interface Preferences {
  baseUrl: string;
  apiToken: string;
}

const prefs = getPreferenceValues<Preferences>();

export const baseUrl = normalizeBaseUrl(prefs.baseUrl);

type Query = Record<string, string | number | boolean | undefined>;

function withQuery(path: string, query?: Query): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

async function toError(res: Response, url: string): Promise<Error> {
  if (res.status === 401 || res.status === 403) {
    return new Error(
      "Kimai rejected the API token — check it under User → API Access",
    );
  }
  if (res.status === 404) {
    // A wrong "Kimai URL" preference looks exactly like this; the token would give 401.
    return new Error(`Not found: ${url} — check the Kimai URL preference`);
  }
  const body = await res.text().catch(() => "");
  let detail = body;
  try {
    const parsed = JSON.parse(body) as { message?: string; errors?: unknown };
    detail = parsed.message ?? JSON.stringify(parsed.errors ?? "");
  } catch {
    // Not JSON (nginx error page, redirect to a login form) — keep the raw text.
  }
  return new Error(
    `Kimai ${res.status} on ${url}: ${detail.slice(0, 200) || res.statusText}`,
  );
}

async function api<T>(
  path: string,
  init?: RequestInit,
  query?: Query,
): Promise<T> {
  const url = `${baseUrl}/api${withQuery(path, query)}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${prefs.apiToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) throw await toError(res, url);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const byName = <T extends { name: string }>(items: T[]) =>
  [...items].sort((a, b) => a.name.localeCompare(b.name));

// --- timesheets ---

export const getActiveTimers = () => api<Timesheet[]>("/timesheets/active");

export const listTimesheets = (query: Query = {}) =>
  api<Timesheet[]>("/timesheets", undefined, {
    full: true,
    size: 100,
    ...query,
  });

export const stopTimer = (id: number) =>
  api<Timesheet>(`/timesheets/${id}/stop`, { method: "PATCH" });

export const restartTimer = (id: number) =>
  api<Timesheet>(`/timesheets/${id}/restart`, { method: "PATCH" });

export const duplicateTimesheet = (id: number) =>
  api<Timesheet>(`/timesheets/${id}/duplicate`, { method: "PATCH" });

export const deleteTimesheet = (id: number) =>
  api<void>(`/timesheets/${id}`, { method: "DELETE" });

export interface TimesheetInput {
  begin?: Date;
  end?: Date | null;
  project?: number;
  activity?: number;
  description?: string;
  tags?: string;
}

function serialize(input: TimesheetInput) {
  return {
    ...input,
    begin: input.begin ? toKimaiDate(input.begin) : undefined,
    end: input.end ? toKimaiDate(input.end) : undefined,
  };
}

export const startTimer = (
  project: number,
  activity: number,
  description?: string,
  tags?: string,
) =>
  api<Timesheet>("/timesheets", {
    method: "POST",
    body: JSON.stringify(
      serialize({ begin: new Date(), project, activity, description, tags }),
    ),
  });

export const updateTimesheet = (id: number, input: TimesheetInput) =>
  api<Timesheet>(`/timesheets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(serialize(input)),
  });

// --- master data ---

export const listCustomers = async () =>
  byName(await api<Customer[]>("/customers", undefined, { visible: 1 }));

export const listProjects = async () =>
  byName(await api<Project[]>("/projects", undefined, { visible: 1 }));

/** `/projects` only carries customer IDs, but every view wants the customer name. */
export async function listProjectsWithCustomers(): Promise<Project[]> {
  const [projects, customers] = await Promise.all([
    listProjects(),
    listCustomers(),
  ]);
  const byId = new Map(customers.map((c) => [c.id, c]));
  return projects.map((p) => ({
    ...p,
    customer:
      (typeof p.customer === "number" ? byId.get(p.customer) : p.customer) ??
      p.customer,
  }));
}

/** Passing a project returns that project's activities plus the global ones. */
export const listActivities = async (project?: number) =>
  byName(
    await api<Activity[]>("/activities", undefined, { visible: 1, project }),
  );

export const listTags = () => api<string[]>("/tags");

// --- display helpers ---

export const customerName = (project: Project | undefined) =>
  project && typeof project.customer === "object"
    ? project.customer.name
    : undefined;

export function timesheetTitle(entry: Timesheet): string {
  return entry.description?.trim() || entry.activity?.name || "Untitled";
}

export function timesheetSubtitle(entry: Timesheet): string {
  return [
    customerName(entry.project),
    entry.project?.name,
    entry.activity?.name,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Running entries have `duration: 0`, so derive it from `begin`. */
export function elapsedSeconds(entry: Timesheet): number {
  if (entry.end) return entry.duration;
  return (Date.now() - new Date(entry.begin).getTime()) / 1000;
}

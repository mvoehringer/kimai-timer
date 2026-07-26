/**
 * Raycast ships no i18n layer and does not translate anything itself, so this is the
 * whole translation system: one English dictionary that defines the shape, and one
 * German dictionary typed against it — TypeScript refuses to compile if a key is
 * missing or a placeholder mismatches. The language follows the system, no setting.
 *
 * Not covered: command titles, descriptions and preference labels. Those live in
 * package.json, which Raycast reads before any code runs and cannot localise.
 */
const en = {
  // menu bar
  noRunningTimer: "No running timer",
  stop: "Stop",
  continueSection: "Continue",
  startTimerEllipsis: "Start Timer…",
  timesheetsEllipsis: "Timesheets…",
  openKimai: "Open Kimai",
  stoppedAfter: (duration: string) => `Stopped after ${duration}`,
  stoppedCount: (count: number) => `Stopped ${count} timers`,
  couldNotStop: "Could not stop the timer",
  couldNotContinue: "Could not continue this task",

  // starting timers
  stoppingTimer: "Stopping timer…",
  startingTimer: "Starting timer…",
  timerStarted: "Timer started",
  couldNotStart: "Could not start the timer",
  pickProjectAndActivity: "Pick a project and an activity",

  // start-timer form
  startTimer: "Start Timer",
  project: "Project",
  activity: "Activity",
  description: "Description",
  descriptionPlaceholder: "What are you working on?",
  tags: "Tags",

  // timesheets
  searchTimesheets: "Search descriptions, projects, activities…",
  noTimeEntries: "No time entries",
  noTimeEntriesHint: "Start a timer to see entries here.",
  couldNotLoadTimesheets: "Could not load timesheets",
  stopTimer: "Stop Timer",
  restartTimer: "Restart Timer",
  editEntry: "Edit Entry",
  duplicateEntry: "Duplicate Entry",
  copyDescription: "Copy Description",
  deleteEntry: "Delete Entry",
  timerStopped: "Timer stopped",
  timerRestarted: "Timer restarted",
  entryDuplicated: "Entry duplicated",
  entryDeleted: "Entry deleted",
  deleteConfirmTitle: "Delete time entry?",
  delete: "Delete",
  saving: "Saving…",
  entrySaved: "Entry saved",
  couldNotSave: "Could not save the entry",
  saveEntry: "Save Entry",
  begin: "Begin",
  end: "End",
  untitled: "Untitled",
  today: "Today",
  yesterday: "Yesterday",

  // projects
  searchProjects: "Search projects…",
  noVisibleProjects: "No visible projects",
  withoutCustomer: "Without customer",
  showActivities: "Show Activities",
  startWithDescription: "Start With Description…",
  searchActivities: "Search activities…",
  noActivities: "No activities for this project",
  globalActivity: "Global",
  couldNotLoadProjects: "Could not load projects",
  couldNotLoadActivities: "Could not load activities",
  couldNotLoadTags: "Could not load tags",

  // report
  thisWeek: "This Week",
  thisMonth: "This Month",
  filterProjects: "Filter projects…",
  noTimeTracked: "No time tracked in this range",
  timeRange: "Time range",
  unknownProject: "Unknown project",
  entryCount: (count: number) =>
    `${count} ${count === 1 ? "entry" : "entries"}`,
  couldNotLoadReport: "Could not load the report",

  // API errors
  tokenRejected:
    "Kimai rejected the API token — check it under User → API Access",
  notFound: (url: string) =>
    `Not found: ${url} — check the Kimai URL preference`,
};

type Dictionary = typeof en;

const de: Dictionary = {
  noRunningTimer: "Kein Timer läuft",
  stop: "Stoppen",
  continueSection: "Fortsetzen",
  startTimerEllipsis: "Timer starten…",
  timesheetsEllipsis: "Zeiteinträge…",
  openKimai: "Kimai öffnen",
  stoppedAfter: (duration) => `Gestoppt nach ${duration}`,
  stoppedCount: (count) => `${count} Timer gestoppt`,
  couldNotStop: "Timer konnte nicht gestoppt werden",
  couldNotContinue: "Aufgabe konnte nicht fortgesetzt werden",

  stoppingTimer: "Stoppe Timer…",
  startingTimer: "Starte Timer…",
  timerStarted: "Timer gestartet",
  couldNotStart: "Timer konnte nicht gestartet werden",
  pickProjectAndActivity: "Projekt und Tätigkeit auswählen",

  startTimer: "Timer starten",
  project: "Projekt",
  activity: "Tätigkeit",
  description: "Beschreibung",
  descriptionPlaceholder: "Woran arbeitest du?",
  tags: "Schlagwörter",

  searchTimesheets: "Beschreibungen, Projekte, Tätigkeiten durchsuchen…",
  noTimeEntries: "Keine Zeiteinträge",
  noTimeEntriesHint: "Starte einen Timer, dann erscheinen hier Einträge.",
  couldNotLoadTimesheets: "Zeiteinträge konnten nicht geladen werden",
  stopTimer: "Timer stoppen",
  restartTimer: "Timer neu starten",
  editEntry: "Eintrag bearbeiten",
  duplicateEntry: "Eintrag duplizieren",
  copyDescription: "Beschreibung kopieren",
  deleteEntry: "Eintrag löschen",
  timerStopped: "Timer gestoppt",
  timerRestarted: "Timer neu gestartet",
  entryDuplicated: "Eintrag dupliziert",
  entryDeleted: "Eintrag gelöscht",
  deleteConfirmTitle: "Zeiteintrag löschen?",
  delete: "Löschen",
  saving: "Speichere…",
  entrySaved: "Eintrag gespeichert",
  couldNotSave: "Eintrag konnte nicht gespeichert werden",
  saveEntry: "Eintrag speichern",
  begin: "Beginn",
  end: "Ende",
  untitled: "Ohne Beschreibung",
  today: "Heute",
  yesterday: "Gestern",

  searchProjects: "Projekte durchsuchen…",
  noVisibleProjects: "Keine sichtbaren Projekte",
  withoutCustomer: "Ohne Kunde",
  showActivities: "Tätigkeiten anzeigen",
  startWithDescription: "Mit Beschreibung starten…",
  searchActivities: "Tätigkeiten durchsuchen…",
  noActivities: "Keine Tätigkeiten für dieses Projekt",
  globalActivity: "Global",
  couldNotLoadProjects: "Projekte konnten nicht geladen werden",
  couldNotLoadActivities: "Tätigkeiten konnten nicht geladen werden",
  couldNotLoadTags: "Schlagwörter konnten nicht geladen werden",

  thisWeek: "Diese Woche",
  thisMonth: "Dieser Monat",
  filterProjects: "Projekte filtern…",
  noTimeTracked: "In diesem Zeitraum nichts erfasst",
  timeRange: "Zeitraum",
  unknownProject: "Unbekanntes Projekt",
  entryCount: (count) => `${count} ${count === 1 ? "Eintrag" : "Einträge"}`,
  couldNotLoadReport: "Bericht konnte nicht geladen werden",

  tokenRejected:
    "Kimai hat den API-Token abgelehnt — prüfe ihn unter Benutzer → API-Zugriff",
  notFound: (url) =>
    `Nicht gefunden: ${url} — prüfe die Kimai-URL in den Einstellungen`,
};

// The OS locale is the only language signal available: @raycast/api exposes no locale.
const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale;

const language = systemLocale.toLowerCase().startsWith("de") ? "de" : "en";

export const t = language === "de" ? de : en;

/** For toLocaleDateString, so dates follow the chosen language rather than the system. */
export const locale = language === "de" ? "de-DE" : "en-US";

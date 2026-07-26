# Kimai Raycast Extension — Implementierungsplan

## Context

`~/Projects/kimai-raycast` ist ein frisch initialisiertes, leeres Git-Repo. Ziel: eine Raycast-Extension,
die Kimai-Zeiterfassung komplett aus Raycast bedienbar macht — Timer starten/stoppen, laufende Zeit in der
Menüleiste, Zeiteinträge verwalten, Stammdaten (Kunden/Projekte/Aktivitäten) durchsuchen, einfache Reports.
Der Nutzen: Zeiterfassung ohne Browser-Tab, in unter zwei Sekunden erreichbar.

Kimai bietet dafür eine vollständige REST-API (`/api`), Auth über `Authorization: Bearer <API-Token>`
(Token pro User im Kimai-Profil erzeugbar). Es gibt kein SDK für TS — der Client wird selbst geschrieben,
klein gehalten (ein `fetch`-Wrapper, kein Generator, kein OpenAPI-Codegen).

## Stack & Konventionen

- TypeScript + React, `@raycast/api` + `@raycast/utils` (liefert `useCachedPromise`, `useFetch`, `showFailureToast`)
- **bun** für Install und Scripts; `ray`-CLI via `bunx ray …`. Falls `ray develop` unter bun zickt: auf npm für genau diesen Befehl ausweichen (dokumentieren, nicht generalisieren).
- Kein State-Management, keine Service-Layer-Abstraktion. Ein API-Modul, Komponenten rufen direkt auf.

## Kimai-API — verifizierte Fakten

Auth: `Authorization: Bearer <token>`, HTTPS zwingend.

| Zweck | Endpoint |
|---|---|
| Laufende Timer | `GET /api/timesheets/active` |
| Zuletzt genutzt | `GET /api/timesheets/recent` |
| Liste (Filter: `begin,end,project,customer,activity,term,page,size,order_by,order,active,billable`) | `GET /api/timesheets` |
| Anlegen / Ändern / Löschen | `POST /api/timesheets`, `PATCH /api/timesheets/{id}`, `DELETE /api/timesheets/{id}` |
| Stoppen / Neu starten / Duplizieren | `PATCH /api/timesheets/{id}/stop` · `/restart` · `/duplicate` |
| Stammdaten | `GET /api/customers`, `/api/projects`, `/api/activities`, `/api/tags` |

**Gotcha:** Die API *liefert* ISO 8601, *erwartet* aber bei POST/PATCH lokales HTML5-Format
`yyyy-MM-ddTHH:mm:ss` **ohne** Zeitzone. Ein Helper `toKimaiDate(Date)` gehört in den Client, sonst
landen Einträge stundenversetzt.

## Dateien

```
package.json            manifest: preferences + 6 commands
src/kimai.ts            fetch-Wrapper, Typen, toKimaiDate — das gesamte API-Layer
src/menubar.tsx         mode: menu-bar, interval: 1m — laufender Timer + Stop
src/start-timer.tsx     mode: view — Projekt/Aktivität wählen, Beschreibung, Tags → POST
src/stop-timer.ts       mode: no-view — stoppt alle aktiven Timer, Toast
src/timesheets.tsx      mode: view — Einträge listen/filtern, edit/delete/restart/duplicate
src/projects.tsx        mode: view — Kunden→Projekte→Aktivitäten, Timer direkt starten
src/report.tsx          mode: view — Summen heute/Woche/Monat, gruppiert nach Projekt
assets/icon.png         512×512
```

`src/kimai.ts` ist die einzige Stelle mit `fetch`. Ein generisches `api<T>(path, init?)`:
Base-URL aus Preferences (Trailing-Slash normalisieren), Bearer-Header, `res.ok`-Check mit
Kimai-Fehlermeldung im Throw, 401 → klare Meldung „API-Token prüfen".

## Preferences (package.json)

- `baseUrl` — textfield, required, Placeholder `https://kimai.example.com`
- `apiToken` — `password`, required (neuere Manifest-Docs nennen den Typ `secret`; beim Bau mit `bunx ray lint` verifizieren und den akzeptierten Wert nehmen)
- `defaultProject` / `defaultActivity` — optional, textfield mit ID, spart bei „Start Timer" zwei Klicks

## Umsetzung in Schritten

1. **Gerüst + Client.** `bunx create-raycast-extension` (non-interaktiv, TypeScript-Template), dann alles Überflüssige löschen. `src/kimai.ts` schreiben inkl. Typen (`Timesheet`, `Project`, `Customer`, `Activity`) und `toKimaiDate`. Ein `bun test`-freier Selfcheck: `assert` auf `toKimaiDate` (kein Framework).
2. **Stop + Menubar.** Kleinste nützliche Schleife zuerst: `stop-timer.ts` und `menubar.tsx` (`useCachedPromise` auf `/timesheets/active`, Titel = Projekt + laufende Dauer, Menüeintrag „Stop"). Damit ist die API-Anbindung end-to-end verifiziert, bevor Formulare dazukommen.
3. **Start Timer.** `Form` mit Dropdowns für Projekt/Aktivität (aus `/projects`, `/activities?project=`), Beschreibung, Tags. Letzte Auswahl über `LocalStorage` merken und vorbelegen. POST `/api/timesheets` mit `begin: toKimaiDate(new Date())`.
4. **Timesheets-Liste.** `List` mit Accessories (Dauer, Projekt), Section „Heute"/„Diese Woche". ActionPanel: Restart, Duplicate, Edit (Push auf Form), Delete (mit `Alert.confirmAlert`), Copy-ID. Suche über `term`-Query, nicht clientseitig.
5. **Projects-Browser.** `List` über `/customers` → Push-Detail Projekte → Aktivitäten, jeweils Action „Timer starten" (ruft dieselbe Start-Funktion wie Schritt 3 — kein zweiter Codepfad).
6. **Report.** `/api/timesheets?begin=…&end=…&size=…` holen und lokal aggregieren (Kimai hat keinen Report-Endpoint). `List` mit Projektsummen + Gesamtdauer als Section-Subtitle.
7. **Politur.** README, CHANGELOG, `bunx ray lint --fix`, `.gitignore` (node_modules, .DS_Store, raycast-env.d.ts nicht ignorieren).

## Verifikation

- `bunx ray lint` und `bunx ray build -e dist` laufen fehlerfrei.
- `bunx ray develop` gegen eine echte Instanz (oder https://demo.kimai.org mit eigenem Token): Timer starten → erscheint in der Menüleiste mit laufender Dauer → in Kimai-Weboberfläche sichtbar mit **korrekter Startzeit** (Zeitzonen-Gotcha) → Stop über Raycast → in Kimai beendet.
- Fehlerpfade bewusst auslösen: falscher Token (401-Toast), falsche Base-URL (Netzwerkfehler-Toast), Stop ohne laufenden Timer (freundlicher Hinweis statt Crash).
- Reports gegen die Kimai-Weboberfläche gegenrechnen (eine Woche, Summe pro Projekt).

## Bewusst weggelassen

- Kein OpenAPI-Codegen, keine generierte Client-Library — sechs Endpoints rechtfertigen das nicht.
- Keine Offline-Queue / kein optimistisches Caching über `useCachedPromise` hinaus.
- Kein Store-Release-Prozess in v1 (lokale Extension); nachziehen, wenn sie sich bewährt.

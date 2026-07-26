import {
  Color,
  Icon,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  open,
  showHUD,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  Timesheet,
  baseUrl,
  elapsedSeconds,
  getActiveTimers,
  getResumableTasks,
  restartTimer,
  stopTimer,
  timesheetSubtitle,
  timesheetTitle,
} from "./kimai";
import { formatClock, formatDuration, formatHm } from "./format";
import { t } from "./i18n";

const RECENT_COUNT = 4;

const describe = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/** Re-render once a second so the elapsed time ticks while the menu is open. */
function useTicker() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((tick) => tick + 1), 1000);
    return () => clearInterval(timer);
  }, []);
}

export default function Command() {
  useTicker();
  const { data, isLoading, revalidate } = useCachedPromise(
    getActiveTimers,
    [],
    {
      keepPreviousData: true,
      // No toast on failure: on a background refresh the Toast API throws outright,
      // and a menu bar command must never crash on a temporarily unreachable server.
      onError: () => undefined,
    },
  );

  const recent = useCachedPromise(getResumableTasks, [RECENT_COUNT], {
    keepPreviousData: true,
    onError: () => undefined,
  });

  const running = data?.[0];

  function refresh() {
    revalidate();
    recent.revalidate();
  }

  async function stop(entry: Timesheet) {
    try {
      const stopped = await stopTimer(entry.id);
      refresh();
      await showHUD(`⏹ ${t.stoppedAfter(formatDuration(stopped.duration))}`);
    } catch (error) {
      await showHUD(`⚠︎ ${t.couldNotStop} — ${describe(error)}`);
    }
  }

  async function resume(id: number, label: string) {
    try {
      await restartTimer(id);
      refresh();
      await showHUD(`▶ ${label}`);
    } catch (error) {
      await showHUD(`⚠︎ ${t.couldNotContinue} — ${describe(error)}`);
    }
  }

  return (
    <MenuBarExtra
      // Untinted so macOS renders it as a template image in both appearances.
      icon={running ? Icon.Stopwatch : Icon.Clock}
      title={running ? formatHm(elapsedSeconds(running)) : undefined}
      tooltip={running ? timesheetSubtitle(running) : t.noRunningTimer}
      isLoading={isLoading}
    >
      {data?.map((entry) => (
        <MenuBarExtra.Section key={entry.id} title={timesheetTitle(entry)}>
          <MenuBarExtra.Item
            icon={{ source: Icon.Stopwatch, tintColor: Color.Green }}
            title={formatClock(elapsedSeconds(entry))}
            subtitle={timesheetSubtitle(entry)}
          />
          <MenuBarExtra.Item
            icon={{ source: Icon.Stop, tintColor: Color.Red }}
            title={t.stop}
            onAction={() => stop(entry)}
          />
        </MenuBarExtra.Section>
      ))}
      {(recent.data ?? []).length > 0 && (
        <MenuBarExtra.Section title={t.continueSection}>
          {recent.data?.map((entry) => (
            <MenuBarExtra.Item
              key={entry.id}
              icon={{ source: Icon.ArrowClockwise, tintColor: Color.Green }}
              title={timesheetSubtitle(entry)}
              subtitle={entry.description?.trim() || undefined}
              onAction={() => resume(entry.id, timesheetSubtitle(entry))}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.Play}
          title={t.startTimerEllipsis}
          onAction={() =>
            launchCommand({
              name: "start-timer",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Item
          icon={Icon.List}
          title={t.timesheetsEllipsis}
          onAction={() =>
            launchCommand({
              name: "timesheets",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Item
          icon={Icon.Globe}
          title={t.openKimai}
          onAction={() => open(baseUrl)}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

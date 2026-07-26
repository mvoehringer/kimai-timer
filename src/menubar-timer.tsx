import {
  Color,
  Icon,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  open,
  showHUD,
} from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
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

const RECENT_COUNT = 4;

/** Kimai has no pause endpoint, so a pause is a stop plus a note of what to resume. */
interface PausedTask {
  id: number;
  title: string;
  subtitle: string;
  /** Seconds booked before pausing — shown in the menu bar so the state stays visible. */
  duration: number;
}

/**
 * Menu bar icons stay untinted so macOS can render them as template images in both
 * appearances — colour belongs inside the open menu, not in the status bar.
 */
function menuBarIcon(
  running: Timesheet | undefined,
  paused: PausedTask | undefined,
) {
  if (running) return Icon.Stopwatch;
  if (paused) return Icon.Pause;
  return Icon.Clock;
}

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
    // The running timer already has its own section, and a failure here must not
    // take down the menu bar — the active timer is what matters.
    onError: () => undefined,
  });

  const paused = useLocalStorage<PausedTask | undefined>("paused-task");

  const running = data?.[0];

  function refresh() {
    revalidate();
    recent.revalidate();
  }

  async function stop(entry: Timesheet) {
    try {
      const stopped = await stopTimer(entry.id);
      await paused.removeValue();
      refresh();
      await showHUD(`⏹ Stopped after ${formatDuration(stopped.duration)}`);
    } catch (error) {
      await showHUD(`⚠︎ Could not stop the timer — ${describe(error)}`);
    }
  }

  async function pause(entry: Timesheet) {
    try {
      const stopped = await stopTimer(entry.id);
      await paused.setValue({
        id: entry.id,
        title: timesheetTitle(entry),
        subtitle: timesheetSubtitle(entry),
        duration: stopped.duration,
      });
      refresh();
      await showHUD(`⏸ Paused at ${formatDuration(stopped.duration)}`);
    } catch (error) {
      await showHUD(`⚠︎ Could not pause the timer — ${describe(error)}`);
    }
  }

  async function resume(id: number, label: string) {
    try {
      await restartTimer(id);
      await paused.removeValue();
      refresh();
      await showHUD(`▶ ${label}`);
    } catch (error) {
      await showHUD(`⚠︎ Could not continue this task — ${describe(error)}`);
    }
  }

  // A paused task gets its own entry, so keep it out of the Continue list below.
  const resumable = (recent.data ?? []).filter(
    (entry) => entry.id !== paused.value?.id,
  );
  const pausedTask = running ? undefined : paused.value;

  return (
    <MenuBarExtra
      icon={menuBarIcon(running, pausedTask)}
      title={
        running
          ? formatHm(elapsedSeconds(running))
          : pausedTask && formatHm(pausedTask.duration)
      }
      tooltip={
        running
          ? timesheetSubtitle(running)
          : pausedTask
            ? `Paused: ${pausedTask.subtitle}`
            : "No running timer"
      }
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
            icon={{ source: Icon.Pause, tintColor: Color.Yellow }}
            title="Pause"
            onAction={() => pause(entry)}
          />
          <MenuBarExtra.Item
            icon={{ source: Icon.Stop, tintColor: Color.Red }}
            title="Stop"
            onAction={() => stop(entry)}
          />
        </MenuBarExtra.Section>
      ))}
      {pausedTask && (
        <MenuBarExtra.Section
          title={`Paused · ${formatClock(pausedTask.duration)}`}
        >
          <MenuBarExtra.Item
            icon={{ source: Icon.Play, tintColor: Color.Green }}
            title={pausedTask.title}
            subtitle={pausedTask.subtitle}
            onAction={() => resume(pausedTask.id, pausedTask.subtitle)}
          />
        </MenuBarExtra.Section>
      )}
      {resumable.length > 0 && (
        <MenuBarExtra.Section title="Continue">
          {resumable.map((entry) => (
            <MenuBarExtra.Item
              key={entry.id}
              icon={Icon.ArrowClockwise}
              title={timesheetTitle(entry)}
              subtitle={timesheetSubtitle(entry)}
              onAction={() => resume(entry.id, timesheetSubtitle(entry))}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.Play}
          title="Start Timer…"
          onAction={() =>
            launchCommand({
              name: "start-timer",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Item
          icon={Icon.List}
          title="Timesheets…"
          onAction={() =>
            launchCommand({
              name: "timesheets",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Item
          icon={Icon.Globe}
          title="Open Kimai"
          onAction={() => open(baseUrl)}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

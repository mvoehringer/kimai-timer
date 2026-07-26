import {
  Color,
  Icon,
  LaunchType,
  MenuBarExtra,
  Toast,
  launchCommand,
  open,
  showToast,
} from "@raycast/api";
import {
  showFailureToast,
  useCachedPromise,
  useLocalStorage,
} from "@raycast/utils";
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
import { formatClock, formatDuration } from "./format";

const RECENT_COUNT = 4;

/** Kimai has no pause endpoint, so a pause is a stop plus a note of what to resume. */
interface PausedTask {
  id: number;
  title: string;
  subtitle: string;
  /** Seconds booked before pausing — shown in the menu bar so the state stays visible. */
  duration: number;
}

/** Three distinguishable states at a glance: running, paused, idle. */
function menuBarIcon(
  running: Timesheet | undefined,
  paused: PausedTask | undefined,
) {
  if (running) return { source: Icon.Stopwatch, tintColor: Color.Green };
  if (paused) return { source: Icon.Pause, tintColor: Color.Yellow };
  return { source: Icon.Clock, tintColor: Color.SecondaryText };
}

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(
    getActiveTimers,
    [],
    {
      keepPreviousData: true,
      failureToastOptions: { title: "Could not reach Kimai" },
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
      await showToast({
        style: Toast.Style.Animated,
        title: "Stopping timer…",
      });
      const stopped = await stopTimer(entry.id);
      await paused.removeValue();
      await showToast({
        style: Toast.Style.Success,
        title: `Stopped after ${formatDuration(stopped.duration)}`,
      });
      refresh();
    } catch (error) {
      await showFailureToast(error, { title: "Could not stop the timer" });
    }
  }

  async function pause(entry: Timesheet) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Pausing…" });
      const stopped = await stopTimer(entry.id);
      await paused.setValue({
        id: entry.id,
        title: timesheetTitle(entry),
        subtitle: timesheetSubtitle(entry),
        duration: stopped.duration,
      });
      await showToast({
        style: Toast.Style.Success,
        title: `Paused after ${formatDuration(stopped.duration)}`,
        message: timesheetSubtitle(entry),
      });
      refresh();
    } catch (error) {
      await showFailureToast(error, { title: "Could not pause the timer" });
    }
  }

  async function resume(id: number, label: string) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Starting timer…",
      });
      await restartTimer(id);
      await paused.removeValue();
      await showToast({
        style: Toast.Style.Success,
        title: "Timer started",
        message: label,
      });
      refresh();
    } catch (error) {
      await showFailureToast(error, { title: "Could not continue this task" });
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
          ? formatClock(elapsedSeconds(running))
          : pausedTask && formatClock(pausedTask.duration)
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
            icon={Icon.Pause}
            title={`Pause · ${formatClock(elapsedSeconds(entry))}`}
            subtitle={timesheetSubtitle(entry)}
            onAction={() => pause(entry)}
          />
          <MenuBarExtra.Item
            icon={Icon.Stop}
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

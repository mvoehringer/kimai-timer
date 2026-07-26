import {
  Icon,
  LaunchType,
  MenuBarExtra,
  Toast,
  launchCommand,
  open,
  showToast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import {
  Timesheet,
  baseUrl,
  elapsedSeconds,
  getActiveTimers,
  getRecentTimesheets,
  restartTimer,
  stopTimer,
  timesheetSubtitle,
  timesheetTitle,
} from "./kimai";
import { formatClock, formatDuration } from "./format";

const RECENT_COUNT = 5;

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(
    getActiveTimers,
    [],
    {
      keepPreviousData: true,
      failureToastOptions: { title: "Could not reach Kimai" },
    },
  );

  const recent = useCachedPromise(getRecentTimesheets, [RECENT_COUNT], {
    keepPreviousData: true,
    // The running timer already has its own section, and a failure here must not
    // take down the menu bar — the active timer is what matters.
    onError: () => undefined,
  });

  const running = data?.[0];

  function refresh() {
    revalidate();
    recent.revalidate();
  }

  async function stop(id: number) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Stopping timer…",
      });
      const stopped = await stopTimer(id);
      await showToast({
        style: Toast.Style.Success,
        title: `Stopped after ${formatDuration(stopped.duration)}`,
      });
      refresh();
    } catch (error) {
      await showFailureToast(error, { title: "Could not stop the timer" });
    }
  }

  async function resume(entry: Timesheet) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Starting timer…",
      });
      await restartTimer(entry.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Timer started",
        message: timesheetSubtitle(entry),
      });
      refresh();
    } catch (error) {
      await showFailureToast(error, { title: "Could not continue this task" });
    }
  }

  const activeIds = new Set(data?.map((entry) => entry.id));
  const resumable = (recent.data ?? [])
    .filter((entry) => entry.end && !activeIds.has(entry.id))
    .slice(0, RECENT_COUNT);

  return (
    <MenuBarExtra
      icon={running ? Icon.Stopwatch : Icon.Clock}
      title={running ? formatClock(elapsedSeconds(running)) : undefined}
      tooltip={running ? timesheetSubtitle(running) : "No running timer"}
      isLoading={isLoading}
    >
      {data?.map((entry) => (
        <MenuBarExtra.Section key={entry.id} title={timesheetTitle(entry)}>
          <MenuBarExtra.Item
            icon={Icon.Stop}
            title={`Stop · ${formatClock(elapsedSeconds(entry))}`}
            subtitle={timesheetSubtitle(entry)}
            onAction={() => stop(entry.id)}
          />
        </MenuBarExtra.Section>
      ))}
      {resumable.length > 0 && (
        <MenuBarExtra.Section title="Continue">
          {resumable.map((entry) => (
            <MenuBarExtra.Item
              key={entry.id}
              icon={Icon.ArrowClockwise}
              title={timesheetTitle(entry)}
              subtitle={timesheetSubtitle(entry)}
              onAction={() => resume(entry)}
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

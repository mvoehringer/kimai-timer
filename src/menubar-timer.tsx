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
  baseUrl,
  elapsedSeconds,
  getActiveTimers,
  stopTimer,
  timesheetSubtitle,
  timesheetTitle,
} from "./kimai";
import { formatClock, formatDuration } from "./format";

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(
    getActiveTimers,
    [],
    {
      keepPreviousData: true,
      failureToastOptions: { title: "Could not reach Kimai" },
    },
  );

  const running = data?.[0];

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
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "Could not stop the timer" });
    }
  }

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

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

const describe = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

// ponytail: no per-second ticker. A setInterval keeps the menu bar command running
// forever, Raycast kills it after a timeout and every later launch then fails with
// "Missing executable". The elapsed time is resolved each time the menu opens instead.
export default function Command() {
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
      await showHUD(`⏹ Stopped after ${formatDuration(stopped.duration)}`);
    } catch (error) {
      await showHUD(`⚠︎ Could not stop the timer — ${describe(error)}`);
    }
  }

  async function resume(id: number, label: string) {
    try {
      await restartTimer(id);
      refresh();
      await showHUD(`▶ ${label}`);
    } catch (error) {
      await showHUD(`⚠︎ Could not continue this task — ${describe(error)}`);
    }
  }

  return (
    <MenuBarExtra
      // Untinted so macOS renders it as a template image in both appearances.
      icon={running ? Icon.Stopwatch : Icon.Clock}
      title={running ? formatHm(elapsedSeconds(running)) : undefined}
      tooltip={running ? timesheetSubtitle(running) : "No running timer"}
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
            title="Stop"
            onAction={() => stop(entry)}
          />
        </MenuBarExtra.Section>
      ))}
      {recent.data?.length ? (
        <MenuBarExtra.Section title="Continue">
          {recent.data?.map((entry) => {
            // timesheetTitle guarantees a non-empty label when the entities are missing.
            const title = timesheetSubtitle(entry) || timesheetTitle(entry);
            // Include the description so two tasks on the same project · activity
            // (which recentTasks keeps separate) confirm distinguishably in the HUD.
            const hudLabel = [title, entry.description?.trim()]
              .filter(Boolean)
              .join(" — ");
            return (
              <MenuBarExtra.Item
                key={entry.id}
                icon={{ source: Icon.ArrowClockwise, tintColor: Color.Green }}
                title={title}
                subtitle={entry.description?.trim() || undefined}
                onAction={() => resume(entry.id, hudLabel)}
              />
            );
          })}
          <MenuBarExtra.Item
            icon={Icon.List}
            title="Recent Entries…"
            onAction={() =>
              launchCommand({
                name: "timesheets",
                type: LaunchType.UserInitiated,
              })
            }
          />
        </MenuBarExtra.Section>
      ) : null}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.Play}
          title="Start New Timer…"
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

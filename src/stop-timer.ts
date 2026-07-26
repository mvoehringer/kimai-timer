import { LaunchType, Toast, launchCommand, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getActiveTimers, stopRunningTimers, timesheetSubtitle } from "./kimai";
import { formatDuration } from "./format";
import { t } from "./i18n";

export default async function Command() {
  try {
    const active = await getActiveTimers();
    if (active.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: t.noRunningTimer,
      });
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: t.stoppingTimer });
    const stopped = await stopRunningTimers();

    await showToast({
      style: Toast.Style.Success,
      title:
        stopped.length === 1
          ? t.stoppedAfter(formatDuration(stopped[0].duration))
          : t.stoppedCount(stopped.length),
      message: stopped.length === 1 ? timesheetSubtitle(stopped[0]) : undefined,
    });
    await refreshMenuBar();
  } catch (error) {
    await showFailureToast(error, { title: t.couldNotStop });
  }
}

/** Keeps the menu bar from showing a timer that is already stopped. */
export async function refreshMenuBar() {
  try {
    await launchCommand({ name: "menubar-timer", type: LaunchType.Background });
  } catch {
    // The menu bar command may be disabled — not worth surfacing.
  }
}

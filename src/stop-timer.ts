import { LaunchType, Toast, launchCommand, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { stopRunningTimers, timesheetSubtitle } from "./kimai";
import { formatDuration } from "./format";

export default async function Command() {
  try {
    await showToast({ style: Toast.Style.Animated, title: "Stopping timer…" });
    // stopRunningTimers fetches the active timers itself — no separate pre-check call.
    const stopped = await stopRunningTimers();
    if (stopped.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No running timer",
      });
      return;
    }

    await showToast({
      style: Toast.Style.Success,
      title:
        stopped.length === 1
          ? `Stopped after ${formatDuration(stopped[0].duration)}`
          : `Stopped ${stopped.length} timers`,
      message: stopped.length === 1 ? timesheetSubtitle(stopped[0]) : undefined,
    });
    await refreshMenuBar();
  } catch (error) {
    await showFailureToast(error, { title: "Could not stop the timer" });
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

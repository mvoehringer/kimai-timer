import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  Keyboard,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import {
  Timesheet,
  baseUrl,
  deleteTimesheet,
  duplicateTimesheet,
  elapsedSeconds,
  listTimesheets,
  restartTimer,
  stopTimer,
  timesheetSubtitle,
  timesheetTitle,
  updateTimesheet,
} from "./kimai";
import { formatDuration, formatTotal, startOfDay } from "./format";
import { refreshMenuBar } from "./stop-timer";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, revalidate } = useCachedPromise(
    (term: string) => listTimesheets({ term }),
    [searchText],
    {
      keepPreviousData: true,
      failureToastOptions: { title: "Could not load timesheets" },
    },
  );

  // Last tracked first, like the menu bar; a running entry (no end) counts as "now".
  const lastTracked = (entry: Timesheet) =>
    entry.end ? Date.parse(entry.end) : Number.MAX_SAFE_INTEGER;
  const groups = groupByDay(
    [...(data ?? [])].sort((a, b) => lastTracked(b) - lastTracked(a)),
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search descriptions, projects, activities…"
      throttle
    >
      <List.EmptyView
        icon={Icon.Clock}
        title="No time entries"
        description="Start a timer to see entries here."
      />
      {groups.map(([label, entries]) => (
        <List.Section
          key={label}
          title={label}
          subtitle={formatTotal(
            entries.reduce((s, e) => s + elapsedSeconds(e), 0),
          )}
        >
          {entries.map((entry) => (
            <TimesheetItem key={entry.id} entry={entry} onChange={revalidate} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function TimesheetItem({
  entry,
  onChange,
}: {
  entry: Timesheet;
  onChange: () => void;
}) {
  const running = !entry.end;

  async function run(
    progress: string,
    success: string,
    failure: string,
    action: () => Promise<unknown>,
  ) {
    try {
      await showToast({ style: Toast.Style.Animated, title: progress });
      await action();
      await showToast({ style: Toast.Style.Success, title: success });
      onChange();
      await refreshMenuBar();
    } catch (error) {
      await showFailureToast(error, { title: failure });
    }
  }

  async function remove() {
    const confirmed = await confirmAlert({
      title: "Delete time entry?",
      message: timesheetSubtitle(entry),
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed)
      await run(
        "Deleting entry…",
        "Entry deleted",
        "Could not delete the entry",
        () => deleteTimesheet(entry.id),
      );
  }

  return (
    <List.Item
      icon={
        running
          ? { source: Icon.Stopwatch, tintColor: Color.Green }
          : Icon.Clock
      }
      // Same shape as the menu bar: customer · project · activity, comment dimmed.
      title={timesheetSubtitle(entry) || timesheetTitle(entry)}
      subtitle={entry.description?.trim() || undefined}
      accessories={[
        ...(entry.tags ?? []).map((tag) => ({ tag })),
        { text: formatDuration(elapsedSeconds(entry)) },
        {
          date: new Date(entry.begin),
          tooltip: new Date(entry.begin).toLocaleString(),
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {running ? (
              <Action
                icon={Icon.Stop}
                title="Stop Timer"
                onAction={() =>
                  run(
                    "Stopping timer…",
                    "Timer stopped",
                    "Could not stop the timer",
                    () => stopTimer(entry.id),
                  )
                }
              />
            ) : (
              <Action
                icon={Icon.Play}
                title="Restart Timer"
                onAction={() =>
                  run(
                    "Restarting timer…",
                    "Timer restarted",
                    "Could not start the timer",
                    () => restartTimer(entry.id),
                  )
                }
              />
            )}
            <Action.Push
              icon={Icon.Pencil}
              title="Edit Entry"
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={<EditForm entry={entry} onSaved={onChange} />}
            />
            <Action
              icon={Icon.Duplicate}
              title="Duplicate Entry"
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() =>
                run(
                  "Duplicating entry…",
                  "Entry duplicated",
                  "Could not duplicate the entry",
                  () => duplicateTimesheet(entry.id),
                )
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              url={`${baseUrl}/en/timesheet/`}
              title="Open Kimai"
            />
            <Action.CopyToClipboard
              content={timesheetTitle(entry)}
              title="Copy Description"
            />
            <Action
              icon={Icon.Trash}
              title="Delete Entry"
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={remove}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function EditForm({
  entry,
  onSaved,
}: {
  entry: Timesheet;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function submit(values: {
    description: string;
    begin: Date | null;
    end: Date | null;
  }) {
    setSaving(true);
    try {
      await showToast({ style: Toast.Style.Animated, title: "Saving…" });
      await updateTimesheet(entry.id, {
        description: values.description,
        begin: values.begin ?? undefined,
        // Leave a running entry running: only send `end` if it already had one.
        end: entry.end ? values.end : undefined,
      });
      await showToast({ style: Toast.Style.Success, title: "Entry saved" });
      onSaved();
    } catch (error) {
      await showFailureToast(error, { title: "Could not save the entry" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Form
      isLoading={saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Check}
            title="Save Entry"
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Project" text={timesheetSubtitle(entry)} />
      <Form.TextField
        id="description"
        title="Description"
        defaultValue={entry.description ?? ""}
      />
      <Form.DatePicker
        id="begin"
        title="Begin"
        type={Form.DatePicker.Type.DateTime}
        defaultValue={new Date(entry.begin)}
      />
      {entry.end ? (
        <Form.DatePicker
          id="end"
          title="End"
          type={Form.DatePicker.Type.DateTime}
          defaultValue={new Date(entry.end)}
        />
      ) : null}
    </Form>
  );
}

function groupByDay(entries: Timesheet[]): [string, Timesheet[]][] {
  const today = startOfDay().getTime();
  const groups = new Map<string, Timesheet[]>();

  for (const entry of entries) {
    // Group by when tracking ended so the day sections match the end-based sort order.
    const day = startOfDay(new Date(entry.end ?? entry.begin));
    const diffDays = Math.round((today - day.getTime()) / 86_400_000);
    const label =
      diffDays === 0
        ? "Today"
        : diffDays === 1
          ? "Yesterday"
          : day.toLocaleDateString(undefined, { dateStyle: "full" });
    groups.set(label, [...(groups.get(label) ?? []), entry]);
  }

  return [...groups.entries()];
}

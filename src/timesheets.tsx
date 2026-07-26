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
import { locale, t } from "./i18n";
import { formatDuration, formatTotal, startOfDay } from "./format";
import { refreshMenuBar } from "./stop-timer";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, revalidate } = useCachedPromise(
    (term: string) => listTimesheets({ term }),
    [searchText],
    {
      keepPreviousData: true,
      failureToastOptions: { title: t.couldNotLoadTimesheets },
    },
  );

  const groups = groupByDay(data ?? []);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={t.searchTimesheets}
      throttle
    >
      <List.EmptyView
        icon={Icon.Clock}
        title={t.noTimeEntries}
        description={t.noTimeEntriesHint}
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
    title: string,
    failure: string,
    action: () => Promise<unknown>,
  ) {
    try {
      await showToast({ style: Toast.Style.Animated, title: `${title}…` });
      await action();
      await showToast({ style: Toast.Style.Success, title });
      onChange();
      await refreshMenuBar();
    } catch (error) {
      await showFailureToast(error, { title: failure });
    }
  }

  async function remove() {
    const confirmed = await confirmAlert({
      title: t.deleteConfirmTitle,
      message: timesheetSubtitle(entry),
      primaryAction: { title: t.delete, style: Alert.ActionStyle.Destructive },
    });
    if (confirmed)
      await run(t.entryDeleted, t.couldNotSave, () =>
        deleteTimesheet(entry.id),
      );
  }

  return (
    <List.Item
      icon={
        running
          ? { source: Icon.Stopwatch, tintColor: Color.Green }
          : Icon.Clock
      }
      title={timesheetTitle(entry)}
      subtitle={timesheetSubtitle(entry)}
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
                title={t.stopTimer}
                onAction={() =>
                  run(t.timerStopped, t.couldNotStop, () => stopTimer(entry.id))
                }
              />
            ) : (
              <Action
                icon={Icon.Play}
                title={t.restartTimer}
                onAction={() =>
                  run(t.timerRestarted, t.couldNotStart, () =>
                    restartTimer(entry.id),
                  )
                }
              />
            )}
            <Action.Push
              icon={Icon.Pencil}
              title={t.editEntry}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={<EditForm entry={entry} onSaved={onChange} />}
            />
            <Action
              icon={Icon.Duplicate}
              title={t.duplicateEntry}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() =>
                run(t.entryDuplicated, t.couldNotSave, () =>
                  duplicateTimesheet(entry.id),
                )
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              url={`${baseUrl}/en/timesheet/`}
              title={t.openKimai}
            />
            <Action.CopyToClipboard
              content={timesheetTitle(entry)}
              title={t.copyDescription}
            />
            <Action
              icon={Icon.Trash}
              title={t.deleteEntry}
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
      await showToast({ style: Toast.Style.Animated, title: t.saving });
      await updateTimesheet(entry.id, {
        description: values.description,
        begin: values.begin ?? undefined,
        // Leave a running entry running: only send `end` if it already had one.
        end: entry.end ? values.end : undefined,
      });
      await showToast({ style: Toast.Style.Success, title: t.entrySaved });
      onSaved();
    } catch (error) {
      await showFailureToast(error, { title: t.couldNotSave });
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
            title={t.saveEntry}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.Description title={t.project} text={timesheetSubtitle(entry)} />
      <Form.TextField
        id="description"
        title={t.description}
        defaultValue={entry.description ?? ""}
      />
      <Form.DatePicker
        id="begin"
        title={t.begin}
        type={Form.DatePicker.Type.DateTime}
        defaultValue={new Date(entry.begin)}
      />
      {entry.end ? (
        <Form.DatePicker
          id="end"
          title={t.end}
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
    const day = startOfDay(new Date(entry.begin));
    const diffDays = Math.round((today - day.getTime()) / 86_400_000);
    const label =
      diffDays === 0
        ? t.today
        : diffDays === 1
          ? t.yesterday
          : day.toLocaleDateString(locale, { dateStyle: "full" });
    groups.set(label, [...(groups.get(label) ?? []), entry]);
  }

  return [...groups.entries()];
}

import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { customerName, elapsedSeconds, listTimesheets } from "./kimai";
import { t } from "./i18n";
import {
  endOfDay,
  formatTotal,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toKimaiDate,
} from "./format";

const RANGES = {
  today: { title: t.today, from: startOfDay },
  week: { title: t.thisWeek, from: startOfWeek },
  month: { title: t.thisMonth, from: startOfMonth },
} as const;

type RangeKey = keyof typeof RANGES;

/** Kimai has no report endpoint — pull the entries for the range and sum them here. */
async function loadRange(range: RangeKey) {
  const entries = await listTimesheets({
    begin: toKimaiDate(RANGES[range].from()),
    end: toKimaiDate(endOfDay()),
    size: 500,
  });

  const totals = new Map<string, { seconds: number; entries: number }>();
  for (const entry of entries) {
    const key =
      [customerName(entry.project), entry.project?.name]
        .filter(Boolean)
        .join(" · ") || t.unknownProject;
    const current = totals.get(key) ?? { seconds: 0, entries: 0 };
    totals.set(key, {
      seconds: current.seconds + elapsedSeconds(entry),
      entries: current.entries + 1,
    });
  }

  return {
    rows: [...totals.entries()].sort((a, b) => b[1].seconds - a[1].seconds),
    total: entries.reduce((sum, entry) => sum + elapsedSeconds(entry), 0),
  };
}

export default function Command() {
  const [range, setRange] = useState<RangeKey>("week");
  const { data, isLoading } = useCachedPromise(loadRange, [range], {
    keepPreviousData: true,
    failureToastOptions: { title: t.couldNotLoadReport },
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={t.filterProjects}
      searchBarAccessory={
        <List.Dropdown
          tooltip={t.timeRange}
          value={range}
          onChange={(value) => setRange(value as RangeKey)}
        >
          {Object.entries(RANGES).map(([key, { title }]) => (
            <List.Dropdown.Item key={key} value={key} title={title} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView icon={Icon.BarChart} title={t.noTimeTracked} />
      <List.Section
        title={RANGES[range].title}
        subtitle={data ? formatTotal(data.total) : undefined}
      >
        {data?.rows.map(([project, { seconds, entries }]) => (
          <List.Item
            key={project}
            icon={Icon.BarChart}
            title={project}
            subtitle={t.entryCount(entries)}
            accessories={[{ text: formatTotal(seconds) }]}
          />
        ))}
      </List.Section>
    </List>
  );
}

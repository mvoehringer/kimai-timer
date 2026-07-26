import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  popToRoot,
  showToast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import {
  Project,
  customerName,
  listActivities,
  listProjectsWithCustomers,
  startTimer,
} from "./kimai";
import { StartTimerForm } from "./start-timer";
import { refreshMenuBar } from "./stop-timer";

export default function Command() {
  const { data, isLoading } = useCachedPromise(listProjectsWithCustomers, [], {
    failureToastOptions: { title: "Could not load projects" },
  });

  const sections = new Map<string, Project[]>();
  for (const project of data ?? []) {
    const customer = customerName(project) ?? "Without customer";
    sections.set(customer, [...(sections.get(customer) ?? []), project]);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects…">
      <List.EmptyView icon={Icon.Folder} title="No visible projects" />
      {[...sections.entries()].map(([customer, projects]) => (
        <List.Section key={customer} title={customer}>
          {projects.map((project) => (
            <List.Item
              key={project.id}
              icon={Icon.Folder}
              title={project.name}
              actions={
                <ActionPanel>
                  <Action.Push
                    icon={Icon.ArrowRight}
                    title="Show Activities"
                    target={<Activities project={project} />}
                  />
                  <Action.Push
                    icon={Icon.Play}
                    title="Start Timer…"
                    target={<StartTimerForm projectId={project.id} />}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function Activities({ project }: { project: Project }) {
  const { data, isLoading } = useCachedPromise(listActivities, [project.id], {
    failureToastOptions: { title: "Could not load activities" },
  });

  async function start(activityId: number) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Starting timer…",
      });
      await startTimer(project.id, activityId);
      await showToast({
        style: Toast.Style.Success,
        title: "Timer started",
        message: project.name,
      });
      await refreshMenuBar();
      await popToRoot();
    } catch (error) {
      await showFailureToast(error, { title: "Could not start the timer" });
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={project.name}
      searchBarPlaceholder="Search activities…"
    >
      <List.EmptyView icon={Icon.Tag} title="No activities for this project" />
      {data?.map((activity) => (
        <List.Item
          key={activity.id}
          icon={Icon.Tag}
          title={activity.name}
          subtitle={activity.project ? undefined : "Global"}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Play}
                title="Start Timer"
                onAction={() => start(activity.id)}
              />
              <Action.Push
                icon={Icon.Pencil}
                title="Start with Description…"
                target={
                  <StartTimerForm
                    projectId={project.id}
                    activityId={activity.id}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

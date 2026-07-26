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
import { t } from "./i18n";
import { StartTimerForm } from "./start-timer";
import { refreshMenuBar } from "./stop-timer";

export default function Command() {
  const { data, isLoading } = useCachedPromise(listProjectsWithCustomers, [], {
    failureToastOptions: { title: t.couldNotLoadProjects },
  });

  const sections = new Map<string, Project[]>();
  for (const project of data ?? []) {
    const customer = customerName(project) ?? t.withoutCustomer;
    sections.set(customer, [...(sections.get(customer) ?? []), project]);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder={t.searchProjects}>
      <List.EmptyView icon={Icon.Folder} title={t.noVisibleProjects} />
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
                    title={t.showActivities}
                    target={<Activities project={project} />}
                  />
                  <Action.Push
                    icon={Icon.Play}
                    title={t.startTimerEllipsis}
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
    failureToastOptions: { title: t.couldNotLoadActivities },
  });

  async function start(activityId: number) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: t.startingTimer,
      });
      await startTimer(project.id, activityId);
      await showToast({
        style: Toast.Style.Success,
        title: t.timerStarted,
        message: project.name,
      });
      await refreshMenuBar();
      await popToRoot();
    } catch (error) {
      await showFailureToast(error, { title: t.couldNotStart });
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={project.name}
      searchBarPlaceholder={t.searchActivities}
    >
      <List.EmptyView icon={Icon.Tag} title={t.noActivities} />
      {data?.map((activity) => (
        <List.Item
          key={activity.id}
          icon={Icon.Tag}
          title={activity.name}
          subtitle={activity.project ? undefined : t.globalActivity}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Play}
                title={t.startTimer}
                onAction={() => start(activity.id)}
              />
              <Action.Push
                icon={Icon.Pencil}
                title={t.startWithDescription}
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

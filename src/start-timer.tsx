import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  popToRoot,
  showToast,
} from "@raycast/api";
import {
  showFailureToast,
  useCachedPromise,
  useLocalStorage,
} from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  customerName,
  listActivities,
  listProjectsWithCustomers,
  listTags,
  startTimer,
} from "./kimai";
import { t } from "./i18n";
import { refreshMenuBar } from "./stop-timer";

export default function Command() {
  return <StartTimerForm />;
}

export function StartTimerForm({
  projectId,
  activityId,
}: { projectId?: number; activityId?: number } = {}) {
  const projects = useCachedPromise(listProjectsWithCustomers, [], {
    failureToastOptions: { title: t.couldNotLoadProjects },
  });
  const tags = useCachedPromise(listTags, [], {
    failureToastOptions: { title: t.couldNotLoadTags },
  });
  const lastProject = useLocalStorage<string>("last-project");
  const lastActivity = useLocalStorage<string>("last-activity");

  const [project, setProject] = useState(projectId ? String(projectId) : "");
  const [activity, setActivity] = useState(
    activityId ? String(activityId) : "",
  );
  const [submitting, setSubmitting] = useState(false);

  const activities = useCachedPromise(
    listActivities,
    [project ? Number(project) : undefined],
    {
      execute: project !== "",
      failureToastOptions: { title: t.couldNotLoadActivities },
    },
  );

  // Preselect the last used project once both the list and the stored value are in.
  useEffect(() => {
    if (project || !projects.data?.length || lastProject.isLoading) return;
    const remembered = projects.data.find(
      (p) => String(p.id) === lastProject.value,
    );
    setProject(String((remembered ?? projects.data[0]).id));
  }, [projects.data, lastProject.isLoading, lastProject.value, project]);

  // The activity list changes with the project, so re-resolve the selection against it.
  useEffect(() => {
    if (!activities.data?.length) return;
    const stillValid = activities.data.some((a) => String(a.id) === activity);
    if (stillValid) return;
    const remembered = activities.data.find(
      (a) => String(a.id) === lastActivity.value,
    );
    setActivity(String((remembered ?? activities.data[0]).id));
  }, [activities.data, activity, lastActivity.value]);

  async function submit(values: { description: string; tags: string[] }) {
    if (!project || !activity) {
      await showToast({
        style: Toast.Style.Failure,
        title: t.pickProjectAndActivity,
      });
      return;
    }
    setSubmitting(true);
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: t.startingTimer,
      });
      await startTimer(
        Number(project),
        Number(activity),
        values.description,
        values.tags.join(","),
      );
      await Promise.all([
        lastProject.setValue(project),
        lastActivity.setValue(activity),
      ]);
      await showToast({ style: Toast.Style.Success, title: t.timerStarted });
      await refreshMenuBar();
      await popToRoot();
    } catch (error) {
      await showFailureToast(error, { title: t.couldNotStart });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={projects.isLoading || activities.isLoading || submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Play}
            title={t.startTimer}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="project"
        title={t.project}
        value={project}
        onChange={setProject}
        storeValue={false}
      >
        {projects.data?.map((p) => (
          <Form.Dropdown.Item
            key={p.id}
            value={String(p.id)}
            title={[customerName(p), p.name].filter(Boolean).join(" · ")}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="activity"
        title={t.activity}
        value={activity}
        onChange={setActivity}
      >
        {activities.data?.map((a) => (
          <Form.Dropdown.Item key={a.id} value={String(a.id)} title={a.name} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="description"
        title={t.description}
        placeholder={t.descriptionPlaceholder}
      />

      <Form.TagPicker id="tags" title={t.tags}>
        {tags.data?.map((tag) => (
          <Form.TagPicker.Item key={tag} value={tag} title={tag} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

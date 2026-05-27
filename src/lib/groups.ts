type Status = string | undefined;

export type Stage = "done" | "progress" | "upcoming";

export const stageLabels: Record<Stage, string> = {
  done: "Archived",
  progress: "In Progress",
  upcoming: "Scheduled",
};

export function stageFor(status: Status): Stage {
  if (status === "forthcoming" || status === "long-horizon") {
    return "upcoming";
  }

  if (status === "current" || status === "developing") {
    return "progress";
  }

  return "done";
}

export function groupByStage<T extends { data: { status?: string } }>(entries: T[]) {
  return {
    done: entries.filter((entry) => stageFor(entry.data.status) === "done"),
    progress: entries.filter((entry) => stageFor(entry.data.status) === "progress"),
    upcoming: entries.filter((entry) => stageFor(entry.data.status) === "upcoming"),
  };
}

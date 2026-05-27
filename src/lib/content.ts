type EntryLike = {
  id: string;
  data: {
    title: string;
    slug?: string;
    visibility?: "public" | "draft" | "private";
    featured?: boolean;
    date?: Date;
    status?: string;
  };
};

const statusRank: Record<string, number> = {
  open: 0,
  closed: 1,
  current: 2,
  developing: 3,
  forthcoming: 4,
  published: 5,
  archival: 6,
  "long-horizon": 7,
  dormant: 8,
};

const activeStatuses = new Set(["open", "current", "developing", "forthcoming"]);

export function isRenderable<T extends { data: { visibility?: string } }>(entry: T) {
  return entry.data.visibility !== "private";
}

export function slugFor(entry: { id: string; data: { slug?: string } }) {
  return entry.data.slug ?? entry.id.replace(/\.(md|mdx)$/, "").replace(/\/index$/, "");
}

export function bySlug<T extends { id: string; data: { slug?: string } }>(entries: T[]) {
  return new Map(entries.map((entry) => [slugFor(entry), entry]));
}

export function sortByDateDesc<T extends EntryLike>(entries: T[]) {
  return [...entries].sort((a, b) => {
    const aTime = a.data.date?.getTime() ?? 0;
    const bTime = b.data.date?.getTime() ?? 0;
    return bTime - aTime || a.data.title.localeCompare(b.data.title);
  });
}

export function sortByStatusThenTitle<T extends EntryLike>(entries: T[]) {
  return [...entries].sort((a, b) => {
    const aRank = statusRank[a.data.status ?? ""] ?? 50;
    const bRank = statusRank[b.data.status ?? ""] ?? 50;
    return aRank - bRank || a.data.title.localeCompare(b.data.title);
  });
}

export function sortByActiveThenDateDesc<T extends EntryLike>(entries: T[]) {
  return [...entries].sort((a, b) => {
    const activeDelta = Number(!activeStatuses.has(a.data.status ?? "")) - Number(!activeStatuses.has(b.data.status ?? ""));
    const bTime = b.data.date?.getTime() ?? 0;
    const aTime = a.data.date?.getTime() ?? 0;
    return activeDelta || bTime - aTime || a.data.title.localeCompare(b.data.title);
  });
}

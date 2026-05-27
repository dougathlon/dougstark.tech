import type { CollectionEntry } from "astro:content";
import { isRenderable, slugFor } from "./content";

export type CourseEntry = CollectionEntry<"courses">;

export type CourseGroup = {
  slug: string;
  title: string;
  courseCode?: string;
  publicUrl?: string;
  representative: CourseEntry;
  terms: string[];
  latestTime: number;
};

const groupBySlug: Record<string, string> = {
  esports: "esports",
  "esports-fall-2025": "esports",
  "game-analysis": "game-analysis",
  "video-game-analysis": "game-analysis",
  "game-studies": "game-studies",
  "intro-to-video-game-studies": "game-studies",
  "introduction-to-critical-theory": "introduction-to-critical-theory",
  "introduction-to-critical-theory-spring-2026": "introduction-to-critical-theory",
};

const titleByGroup: Record<string, string> = {
  "game-analysis": "Game Analysis",
  "game-studies": "Game Studies",
};

function courseTime(entry: CourseEntry) {
  return entry.data.startDate?.getTime() ?? entry.data.date?.getTime() ?? 0;
}

export function courseGroupSlug(entry: CourseEntry) {
  const slug = slugFor(entry);
  return groupBySlug[slug] ?? slug;
}

export function courseGroups(entries: CourseEntry[]): CourseGroup[] {
  const grouped = new Map<string, CourseEntry[]>();

  for (const entry of entries) {
    if (entry.data.kind !== "course") continue;
    const groupSlug = courseGroupSlug(entry);
    grouped.set(groupSlug, [...(grouped.get(groupSlug) ?? []), entry]);
  }

  return [...grouped.entries()]
    .map(([groupSlug, groupEntries]) => {
      const publicEntries = groupEntries.filter(isRenderable).sort((a, b) => courseTime(b) - courseTime(a));
      const representative = publicEntries[0];
      if (!representative) return undefined;

      const termEntries = [...publicEntries]
        .filter((entry) => entry.data.term)
        .sort((a, b) => courseTime(a) - courseTime(b));
      const representativeTerms = representative.data.terms ?? [];
      const publicUrl = publicEntries.find((entry) => entry.data.publicUrl)?.data.publicUrl;
      const terms = [
        ...new Set([
          ...representativeTerms,
          ...termEntries.map((entry) => entry.data.term as string),
        ]),
      ];
      const latestTime = Math.max(...publicEntries.map(courseTime));

      return {
        slug: groupSlug,
        title: titleByGroup[groupSlug] ?? representative.data.title,
        courseCode: representative.data.courseCode,
        publicUrl,
        representative,
        terms,
        latestTime,
      };
    })
    .filter((group): group is CourseGroup => Boolean(group))
    .sort((a, b) => b.latestTime - a.latestTime || a.title.localeCompare(b.title));
}

export function courseGroupFor(entry: CourseEntry, entries: CourseEntry[]) {
  const groupSlug = courseGroupSlug(entry);
  return courseGroups(entries).find((group) => group.slug === groupSlug);
}

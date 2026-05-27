import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const statusValues = z.enum([
  "open",
  "closed",
  "current",
  "developing",
  "published",
  "forthcoming",
  "archival",
  "long-horizon",
  "dormant",
]);

const visibilityValues = z.enum(["public", "draft", "private"]);

const sharedSchema = z.object({
  title: z.string(),
  slug: z.string().optional(),
  kind: z.string().optional(),
  type: z.string().optional(),
  status: statusValues.optional(),
  visibility: visibilityValues.default("draft"),
  date: z.coerce.date().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  term: z.string().optional(),
  terms: z.array(z.string()).optional(),
  courseCode: z.string().optional(),
  section: z.string().optional(),
  meetingPattern: z.string().optional(),
  location: z.string().optional(),
  enrollment: z.string().optional(),
  summary: z.string().optional(),
  cardSummary: z.string().optional(),
  teaser: z.string().optional(),
  abstract: z.string().optional(),
  publicUrl: z.string().optional(),
  constellations: z.array(z.string()).default([]),
  relatedOutputs: z.array(z.string()).default([]),
  relatedArtifacts: z.array(z.string()).default([]),
  relatedCourses: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  ahlRecordId: z.string().optional(),
  ahlRecordType: z.string().optional(),
  ahlPublicRecord: z.string().optional(),
  ahlImportedAt: z.coerce.date().optional(),
  provenanceNote: z.string().optional(),
  sourceLinkCount: z.number().int().nonnegative().default(0),
  noteLinkCount: z.number().int().nonnegative().default(0),
  commentaryLinkCount: z.number().int().nonnegative().default(0),
  generatedBy: z.string().optional(),
});

const markdownCollection = (name: string) =>
  defineCollection({
    loader: glob({ pattern: "**/*.md", base: `./src/content/${name}` }),
    schema: sharedSchema,
  });

export const collections = {
  constellations: markdownCollection("constellations"),
  outputs: markdownCollection("outputs"),
  courses: markdownCollection("courses"),
  artifacts: markdownCollection("artifacts"),
};

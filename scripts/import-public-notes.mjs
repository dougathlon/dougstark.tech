#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const SITE_ROOT = process.cwd();
const DEFAULT_SOURCE = path.resolve(
  SITE_ROOT,
  "../AgenticHumanitiesLab/archive/public_surface/exports/website_public_records.json"
);
const DEFAULT_OUT_DIR = path.resolve(SITE_ROOT, "tmp/ahl-public-surface");
const DEFAULT_ROUTE_MAP = path.resolve(SITE_ROOT, "scripts/public-surface-route-map.json");
const DEFAULT_CONTENT_DIR = path.resolve(SITE_ROOT, "src/content");
const GENERATED_SUBDIR = "_ahl";
const GENERATED_BY = "ahl-public-surface-import";

const COLLECTIONS = ["constellations", "outputs", "courses", "artifacts"];
const STATUS_VALUES = new Set([
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

const COLLECTION_BY_RECORD_TYPE = {
  research_project: "constellations",
  research_theme: "constellations",
  figure_profile: "constellations",
  research_output: "outputs",
  research_artifact: "artifacts",
  teaching_record: "courses",
};

const KIND_BY_RECORD_TYPE = {
  research_project: "research constellation",
  research_theme: "research theme",
  figure_profile: "figure profile",
  research_output: "output",
  research_artifact: "artifact",
  teaching_record: "course",
};

function parseArgs(argv) {
  const args = {
    source: DEFAULT_SOURCE,
    outDir: DEFAULT_OUT_DIR,
    routeMap: DEFAULT_ROUTE_MAP,
    contentDir: DEFAULT_CONTENT_DIR,
    writeContent: false,
    cleanGenerated: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--source") {
      args.source = path.resolve(SITE_ROOT, argv[index + 1]);
      index += 1;
    } else if (arg === "--out-dir") {
      args.outDir = path.resolve(SITE_ROOT, argv[index + 1]);
      index += 1;
    } else if (arg === "--route-map") {
      args.routeMap = path.resolve(SITE_ROOT, argv[index + 1]);
      index += 1;
    } else if (arg === "--content-dir") {
      args.contentDir = path.resolve(SITE_ROOT, argv[index + 1]);
      index += 1;
    } else if (arg === "--write-content") {
      args.writeContent = true;
    } else if (arg === "--no-clean-generated") {
      args.cleanGenerated = false;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function usage() {
  return `Usage: npm run import:ahl -- [--source PATH] [--out-dir PATH] [--route-map PATH] [--write-content]

Stages AHL public-surface records for website review.

Default source:
  ../AgenticHumanitiesLab/archive/public_surface/exports/website_public_records.json

By default this command does not create visible website pages. It writes review artifacts under tmp/ahl-public-surface/.

Add --write-content to write release-approved records into src/content/*/_ahl/.
Content is written only when website_ready and public_release_allowed are both true and release_warnings is empty.
Generated entries do not create detail routes; they can surface only through the flat section pages and router manifest.`;
}

function readJson(filePath, fallback = undefined) {
  if (!fs.existsSync(filePath)) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`Missing JSON file: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function parseFrontmatter(markdown) {
  const lines = markdown.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return {};
  }

  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end < 0) {
    return {};
  }

  const meta = {};
  let key = null;

  for (const raw of lines.slice(1, end)) {
    if (raw.startsWith("  - ") && key) {
      if (!Array.isArray(meta[key])) {
        meta[key] = [];
      }
      meta[key].push(cleanScalar(raw.slice(4)));
      continue;
    }

    if (!raw.includes(":") || raw.startsWith(" ")) {
      continue;
    }

    const [left, ...rest] = raw.split(":");
    key = left.trim();
    const value = rest.join(":").trim();
    meta[key] = value ? cleanScalar(value) : [];
  }

  return meta;
}

function cleanScalar(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "false") {
    return false;
  }
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed;
}

function collectMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectMarkdownFiles(fullPath);
    }
    return entry.isFile() && entry.name.endsWith(".md") ? [fullPath] : [];
  });
}

function slugForFile(filePath, collectionDir, meta) {
  if (typeof meta.slug === "string" && meta.slug.length > 0) {
    return meta.slug;
  }

  return path
    .relative(collectionDir, filePath)
    .replace(/\\/g, "/")
    .replace(/\.md$/, "")
    .replace(/\/index$/, "");
}

function fallbackHref(collection) {
  if (collection === "courses") {
    return "/teaching";
  }
  if (collection === "artifacts") {
    return "/building";
  }
  return "/writing";
}

function routeHref(collection, _slug, meta = {}) {
  if (typeof meta.publicUrl === "string" && meta.publicUrl.length > 0) {
    return meta.publicUrl;
  }

  return fallbackHref(collection);
}

function targetFromSuggestedRoute(record, routes) {
  const suggestedRoute = record.suggested_route ?? "";
  if (["/", "/writing", "/research", "/teaching", "/building", "/design"].includes(suggestedRoute)) {
    return undefined;
  }

  const exact = routes.byHref.get(suggestedRoute);
  if (exact) {
    return exact;
  }

  const [section, slug] = suggestedRoute.split("/").filter(Boolean);
  const collectionBySection = {
    writing: "constellations",
    research: "constellations",
    teaching: "courses",
    building: "artifacts",
    design: "artifacts",
    output: "outputs",
  };
  const collection = collectionBySection[section];
  if (!collection || !slug) {
    return undefined;
  }

  return routes.byId.get(`${collection}:${slug}`);
}

function collectWebsiteRoutes() {
  const nodes = [];

  for (const collection of COLLECTIONS) {
    const collectionDir = path.join(SITE_ROOT, "src", "content", collection);
    for (const filePath of collectMarkdownFiles(collectionDir)) {
      const meta = parseFrontmatter(fs.readFileSync(filePath, "utf8"));
      const slug = slugForFile(filePath, collectionDir, meta);
      nodes.push({
        id: `${collection}:${slug}`,
        collection,
        slug,
        href: routeHref(collection, slug, meta),
        title: meta.title ?? slug,
        status: meta.status ?? "",
        visibility: meta.visibility ?? "draft",
        generatedBy: meta.generatedBy ?? "",
        ahlRecordId: meta.ahlRecordId ?? "",
        path: path.relative(SITE_ROOT, filePath),
      });
    }
  }

  return {
    nodes,
    byHref: new Map(nodes.map((node) => [node.href, node])),
    byId: new Map(nodes.map((node) => [node.id, node])),
  };
}

function suggestedSlug(record) {
  const route = record.suggested_route ?? "";
  const parts = route.split("/").filter(Boolean);
  if (parts.length > 1) {
    return parts.at(-1);
  }
  return slugify(record.title ?? record.record_id);
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "record";
}

function targetFromRecord(record, routeMap, routes) {
  const mapped = routeMap.records?.[record.record_id];
  if (mapped) {
    const id = `${mapped.collection}:${mapped.slug}`;
    const existing = routes.byId.get(id);
    const frontmatter = mapped.frontmatter ?? {};
    return {
      source: "route_map",
      collection: mapped.collection,
      slug: mapped.slug,
      href: existing?.href ?? routeHref(mapped.collection, mapped.slug, frontmatter),
      mode: mapped.mode ?? "attach_to_existing",
      existingRoute: existing ?? null,
      note: mapped.note ?? "",
      frontmatter,
    };
  }

  const existing = targetFromSuggestedRoute(record, routes);
  if (existing) {
    return {
      source: "suggested_route_content_node_match",
      collection: existing.collection,
      slug: existing.slug,
      href: existing.href,
      mode: "attach_to_existing",
      existingRoute: existing,
      note: "",
      frontmatter: {},
    };
  }

  const collection = COLLECTION_BY_RECORD_TYPE[record.record_type];
  if (collection) {
    const slug = suggestedSlug(record);
    return {
      source: "inferred_collection_route",
      collection,
      slug,
      href: routeHref(collection, slug),
      mode: "candidate_new_route",
      existingRoute: null,
      note: "Release-approved AHL records can become generated collection entries after public review. Generated entries use flat section pages or reviewed public URLs, not detail routes.",
      frontmatter: {},
    };
  }

  return {
    source: "unmapped",
    collection: "",
    slug: "",
    href: record.suggested_route ?? "",
    mode: "manual_review",
    existingRoute: null,
    note: "This record family needs an explicit route decision before website import.",
    frontmatter: {},
  };
}

function reviewState(record) {
  if (Array.isArray(record.release_warnings) && record.release_warnings.length > 0) {
    return "hold_release_warning";
  }
  if (record.public_release_allowed && record.website_ready) {
    return "release_ready";
  }
  if (record.website_ready) {
    return "website_ready_pending_public_release";
  }
  return "hold_pending_public_review";
}

function actionFor(record, target) {
  const state = reviewState(record);

  if (state !== "release_ready") {
    return state;
  }

  if (target.existingRoute) {
    return "attach_to_existing_public_route";
  }

  if (target.collection && target.slug && target.mode !== "manual_review") {
    return "ready_for_generated_collection_entry";
  }

  return "needs_route_mapping";
}

function sanitizeRecord(record, target) {
  return {
    record_id: record.record_id,
    record_type: record.record_type,
    title: record.title,
    visibility: record.visibility,
    review_status: record.review_status,
    website_ready: Boolean(record.website_ready),
    public_release_allowed: Boolean(record.public_release_allowed),
    release_warnings: Array.isArray(record.release_warnings) ? record.release_warnings : [],
    public_summary: record.public_summary ?? "",
    card_summary: record.card_summary ?? "",
    teaser: record.teaser ?? "",
    themes: Array.isArray(record.themes) ? record.themes : [],
    suggested_route: record.suggested_route ?? "",
    source_link_count: Array.isArray(record.source_links) ? record.source_links.length : 0,
    note_link_count: Array.isArray(record.note_links) ? record.note_links.length : 0,
    commentary_link_count: Array.isArray(record.commentary_links) ? record.commentary_links.length : 0,
    target,
    review_state: reviewState(record),
    recommended_action: actionFor(record, target),
  };
}

function yamlScalar(value) {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    return String(value);
  }
  return `"${String(value ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function renderFrontmatter(frontmatter) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
        continue;
      }
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${yamlScalar(item)}`);
      }
    } else {
      lines.push(`${key}: ${yamlScalar(value)}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

function publicRecordPath(record) {
  return `archive/public_surface/records/${record.record_id}/public_record.json`;
}

function statusFor(record, target) {
  const mappedStatus = target.frontmatter?.status;
  if (STATUS_VALUES.has(mappedStatus)) {
    return mappedStatus;
  }
  if (record.record_type === "research_output") {
    return "open";
  }
  if (record.record_type === "teaching_record") {
    return "developing";
  }
  return "open";
}

function generatedFrontmatter(record, importedAt) {
  const target = record.target;
  const mapped = target.frontmatter ?? {};
  const summary = record.card_summary || record.public_summary || "Public summary pending.";
  const frontmatter = {
    title: record.title || "Untitled AHL Record",
    slug: target.slug,
    kind: mapped.kind ?? KIND_BY_RECORD_TYPE[record.record_type] ?? "public record",
    status: statusFor(record, target),
    visibility: "public",
    summary,
    cardSummary: record.card_summary || summary,
    teaser: record.teaser || record.card_summary || summary,
    constellations: mapped.constellations ?? [],
    relatedOutputs: mapped.relatedOutputs ?? [],
    relatedArtifacts: mapped.relatedArtifacts ?? [],
    relatedCourses: mapped.relatedCourses ?? [],
    featured: Boolean(mapped.featured ?? false),
    ahlRecordId: record.record_id,
    ahlRecordType: record.record_type,
    ahlPublicRecord: publicRecordPath(record),
    ahlImportedAt: importedAt,
    provenanceNote:
      "Generated from release-approved AHL public-surface metadata. Private source files, note bodies, processing artifacts, and human commentary remain outside the website.",
    sourceLinkCount: record.source_link_count,
    noteLinkCount: record.note_link_count,
    commentaryLinkCount: record.commentary_link_count,
    generatedBy: GENERATED_BY,
  };

  return { ...frontmatter, ...mapped, visibility: "public", slug: target.slug, generatedBy: GENERATED_BY };
}

function generatedBody(record) {
  const summary = record.public_summary || record.card_summary || "Public summary pending.";
  return `${summary}

## Public Provenance

Generated from AHL public-surface record \`${record.record_id}\`. Private source files, source-local draft notes, processing artifacts, and human commentary are not copied into this website.
`;
}

function generatedMarkdown(record, importedAt) {
  return `${renderFrontmatter(generatedFrontmatter(record, importedAt))}\n\n${generatedBody(record).trim()}\n`;
}

function isManagedRoute(route) {
  return route?.generatedBy === GENERATED_BY || route?.path?.includes(`/${GENERATED_SUBDIR}/`);
}

function contentActionFor(record) {
  const target = record.target;
  if (record.review_state !== "release_ready") {
    return {
      record_id: record.record_id,
      action: "skip_not_release_ready",
      reason: record.review_state,
      target,
    };
  }

  if (!COLLECTIONS.includes(target.collection) || !target.slug) {
    return {
      record_id: record.record_id,
      action: "skip_unmapped_route",
      reason: "Record needs an explicit route-map target before content can be written.",
      target,
    };
  }

  if (target.existingRoute && !isManagedRoute(target.existingRoute)) {
    return {
      record_id: record.record_id,
      action: "skip_existing_public_route",
      reason: "The target route already has hand-authored website content. Attach/update it manually.",
      target,
    };
  }

  return {
    record_id: record.record_id,
    action: "write_generated_content",
    reason: "Release gate passed and no hand-authored route blocks the target slug.",
    target,
  };
}

function generatedPathFor(contentDir, record) {
  return path.join(contentDir, record.target.collection, GENERATED_SUBDIR, `${record.target.slug}.md`);
}

function cleanGeneratedContent(contentDir) {
  const removed = [];
  for (const collection of COLLECTIONS) {
    const generatedDir = path.join(contentDir, collection, GENERATED_SUBDIR);
    for (const filePath of collectMarkdownFiles(generatedDir)) {
      const meta = parseFrontmatter(fs.readFileSync(filePath, "utf8"));
      if (meta.generatedBy === GENERATED_BY) {
        fs.unlinkSync(filePath);
        removed.push(path.relative(SITE_ROOT, filePath));
      }
    }
  }
  return removed;
}

function writeGeneratedContent({ contentDir, records, importedAt, cleanGenerated }) {
  const removed = cleanGenerated ? cleanGeneratedContent(contentDir) : [];
  const actions = records.map(contentActionFor);
  const written = [];

  for (const action of actions) {
    if (action.action !== "write_generated_content") {
      continue;
    }
    const record = records.find((item) => item.record_id === action.record_id);
    const targetPath = generatedPathFor(contentDir, record);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, generatedMarkdown(record, importedAt), "utf8");
    written.push(path.relative(SITE_ROOT, targetPath));
    action.path = path.relative(SITE_ROOT, targetPath);
  }

  return {
    mode: "write_content",
    generatedBy: GENERATED_BY,
    contentDir: path.relative(SITE_ROOT, contentDir),
    removed,
    written,
    actions,
  };
}

function planGeneratedContent({ contentDir, records }) {
  return {
    mode: "staging_only",
    generatedBy: GENERATED_BY,
    contentDir: path.relative(SITE_ROOT, contentDir),
    removed: [],
    written: [],
    actions: records.map(contentActionFor),
  };
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key] ?? "unknown";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function renderMarkdown(summary, records, sourcePath) {
  const lines = [
    "# AHL Public Surface Crosswalk",
    "",
    `Generated: ${summary.generatedAt}`,
    `Source: \`${sourcePath}\``,
    "",
    summary.contentMode === "write_content"
      ? "This run wrote generated Astro Markdown only for release-approved AHL public-surface records. It did not create detail routes."
      : "This is a local staging report. It does not create visible website pages and it should not be deployed as public copy.",
    "",
    "## Counts",
    "",
    `- Total records: ${summary.totalRecords}`,
    `- Website content nodes scanned: ${summary.websiteRouteCount}`,
    `- Generated content written: ${summary.generatedContentWritten}`,
    "",
    "## Actions",
    "",
    ...Object.entries(summary.actions).map(([key, value]) => `- \`${key}\`: ${value}`),
    "",
    "## Record Types",
    "",
    ...Object.entries(summary.recordTypes).map(([key, value]) => `- \`${key}\`: ${value}`),
    "",
    "## Existing Content Node Matches",
    "",
  ];

  const matches = records.filter((record) => record.target.existingRoute);
  if (matches.length === 0) {
    lines.push("- none");
  } else {
    for (const record of matches) {
      lines.push(
        `- \`${record.record_id}\` -> \`${record.target.existingRoute.id}\` (${record.target.existingRoute.href})`
      );
    }
  }

  lines.push("", "## Records Needing Review", "");
  const blocked = records.filter((record) => record.recommended_action !== "attach_to_existing_public_route");
  if (blocked.length === 0) {
    lines.push("- none");
  } else {
    for (const record of blocked.slice(0, 120)) {
      lines.push(
        `- \`${record.record_id}\` | ${record.record_type} | ${record.recommended_action} | ${record.target.href || "no route"}`
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const rawRecords = readJson(args.source);
  if (!Array.isArray(rawRecords)) {
    throw new Error("AHL public-surface export must be a JSON array.");
  }

  const routeMap = readJson(args.routeMap, { records: {} });
  const routes = collectWebsiteRoutes();
  const records = rawRecords.map((record) => {
    const target = targetFromRecord(record, routeMap, routes);
    return sanitizeRecord(record, target);
  });
  const importedAt = new Date().toISOString();
  const contentResult = args.writeContent
    ? writeGeneratedContent({
        contentDir: args.contentDir,
        records,
        importedAt,
        cleanGenerated: args.cleanGenerated,
      })
    : planGeneratedContent({ contentDir: args.contentDir, records });

  const summary = {
    generatedAt: importedAt,
    source: path.relative(SITE_ROOT, args.source),
    outDir: path.relative(SITE_ROOT, args.outDir),
    contentMode: contentResult.mode,
    generatedContentWritten: contentResult.written.length,
    totalRecords: records.length,
    websiteRouteCount: routes.nodes.length,
    actions: countBy(records, "recommended_action"),
    recordTypes: countBy(records, "record_type"),
  };

  fs.mkdirSync(args.outDir, { recursive: true });
  writeJson(path.join(args.outDir, "staging-records.json"), records);
  writeJson(path.join(args.outDir, "crosswalk.json"), {
    summary,
    routeMapPath: path.relative(SITE_ROOT, args.routeMap),
    websiteRoutes: routes.nodes,
    content: contentResult,
    records,
  });
  writeJson(path.join(args.outDir, "content-actions.json"), contentResult);
  fs.writeFileSync(path.join(args.outDir, "crosswalk.md"), renderMarkdown(summary, records, summary.source), "utf8");

  console.log(`Staged ${records.length} AHL public-surface records.`);
  console.log(`Website content nodes scanned: ${routes.nodes.length}.`);
  if (args.writeContent) {
    console.log(`Generated content written: ${contentResult.written.length}.`);
  } else {
    console.log("Generated content not written. Re-run with --write-content after review approval.");
  }
  console.log(`Crosswalk: ${path.relative(SITE_ROOT, path.join(args.outDir, "crosswalk.md"))}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

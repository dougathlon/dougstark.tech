# dougstark.tech

Astro-based public website and publishing infrastructure for Doug Stark.

The site is a public routing surface, not the private research archive. It holds public or publishable records in four primary collections:

- `constellations`: research formations
- `outputs`: publications, talks, essays, performances, and public records of work
- `courses`: public course descriptions and teaching records
- `artifacts`: prototypes, games, tools, experiments, and design works

## Public Surface

The separate knowledgebase should be able to point at stable public route nodes without syncing private notes into this repo.

- Human-facing routes are flat: `/`, `/writing`, `/teaching`, and `/building`.
- Legacy `/research` and `/design` paths redirect to `/writing` and `/building`.
- Cards link directly to public article URLs or hosted PDFs when a reviewed public URL exists.
- Records without a reviewed public URL remain visible only as static cards on their section page, or stay hidden when their visibility/status excludes them.
- Machine-facing route data lives at `/router.json`.
- Edges are declared in Markdown frontmatter with `constellations`, `relatedOutputs`, `relatedArtifacts`, and `relatedCourses`.
- Content collections provide route nodes and metadata; this site intentionally does not expose `/writing/[slug]`, `/teaching/[slug]`, `/building/[slug]`, `/research/[slug]`, `/design/[slug]`, or `/output/[slug]` detail routes.

## Workflow

Private notes / Obsidian / local files / Google Drive / SharePoint
-> selected public batch
-> collection entry in this repo
-> route metadata
-> review and edit
-> GitHub
-> Cloudflare Pages
-> dougstark.tech

## AHL Public Surface Crosswalk

The Agentic Humanities Lab can now stage candidate public records from:

```txt
../AgenticHumanitiesLab/archive/public_surface/exports/website_public_records.json
```

Run:

```sh
npm run import:ahl
```

This writes a local review crosswalk under `tmp/ahl-public-surface/`. It does not create visible pages, does not copy private archive bodies into the website, and does not publish anything. The route map lives at `scripts/public-surface-route-map.json`; use it to attach AHL records to existing public routes before creating new collection entries.

After AHL records pass both release gates, the importer can create generated collection metadata:

```sh
npm run import:ahl -- --write-content
```

That mode writes only release-approved records under `src/content/*/_ahl/`, skips hand-authored content nodes, and keeps source links, note links, processing artifacts, and commentary bodies out of the public site. Generated entries do not create detail pages; they can appear only through the flat section pages and `/router.json` if their collection, status, visibility, and public URL make them eligible.

## Commands

```sh
npm run import:ahl
npm run dev
npm run build
npm run preview
```

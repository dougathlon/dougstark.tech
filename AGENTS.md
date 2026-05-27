# AGENTS.md

This repository is the public-facing website and publishing infrastructure for Doug Stark.

It is a public membrane between private research systems and public intellectual circulation. It should remain Astro-based, Markdown-first, Git-native, static-first, and easy to maintain with Codex.

## Principles

- The private research archive does not belong in this repo.
- Only public or publishable materials belong in this repo.
- The site should avoid generic academic homepage aesthetics, startup aesthetics, excessive animation, and unnecessary JavaScript.
- The design should be restrained, archival, infrastructural, text-forward, readable, and slightly uncanny.
- Content should be organized by constellations, outputs, courses, artifacts, and public route metadata.
- Do not invent publications, projects, grants, talks, collaborators, credentials, or finished work.
- Do not expose private planning material, student advising details, reference contact details, financial or trading systems, internal emails, or unfinished voice-note fragments.
- Preserve older work as archival material rather than erasing it.
- Primary navigation should stay compact: Writing, Teaching, and Building. CV material belongs on the homepage profile card, not as a primary tab.

## Technical Shape

- Use Astro, Markdown-first content collections, semantic HTML, accessible navigation, CSS variables, and minimal JavaScript.
- Keep the site static-first and deployable through GitHub and Cloudflare Pages.
- Avoid unnecessary dependencies. Do not add Tailwind unless it is already installed and clearly justified.
- Do not add databases, authentication, CMS features, or flashy animation.
- Use durable folders under `src/content`, `src/components`, `src/layouts`, `src/pages`, and `src/styles`.

## Public Workflow

The intended path is:

private notes / Obsidian / local files / Google Drive / SharePoint
-> selected public batch
-> imported or copied into the appropriate website collection
-> connected to public route nodes
-> reviewed and edited
-> committed to GitHub
-> deployed through Cloudflare Pages
-> visible on dougstark.tech

Private material must stay outside the repository until it is explicitly selected and reviewed for publication.

## AHL Public Surface Adapter

The website may stage records from the Agentic Humanities Lab public-surface export with:

```sh
npm run import:ahl
```

The importer writes local crosswalk artifacts under `tmp/ahl-public-surface/` and must not create visible pages by default. It should compare AHL records against existing public route nodes, preserve route/provenance metadata, and leave publication decisions to explicit review flags. Do not expose source-local AI drafts, private archive files, human commentary bodies, or unreviewed source summaries as public website copy.

Use `npm run import:ahl -- --write-content` only for records that already pass both AHL release gates. Generated entries belong under `src/content/*/_ahl/`, should skip hand-authored content nodes, and should include only public summaries plus minimal AHL public-record provenance.

## Router Layer

The website should expose stable public route nodes that a separate knowledgebase can point toward without syncing private archive content into this repository.

- Public nodes live in `constellations`, `outputs`, `courses`, and `artifacts`.
- Public edges are declared through frontmatter fields such as `constellations`, `relatedOutputs`, `relatedArtifacts`, and `relatedCourses`.
- The generated `/router.json` manifest is the machine-readable contract for external systems.
- Human-facing pages are intentionally flat: `/`, `/writing`, `/teaching`, and `/building`.
- Keep Cloudflare redirects from `/research` to `/writing` and `/design` to `/building` so older links do not break.
- Public cards should link directly to reviewed external article URLs or hosted PDFs when those exist; otherwise they should remain static rather than falling back to non-existent detail pages.
- Do not revive `Signal` as a top-level section. Current or batch-like material should be staged through existing collections until there is a stronger public reason for a new surface.

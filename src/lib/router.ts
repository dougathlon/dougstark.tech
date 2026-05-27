import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";
import { slugFor } from "./content";

export type RouteCollection = "constellations" | "outputs" | "courses" | "artifacts";
type RouteEntry =
  | CollectionEntry<"constellations">
  | CollectionEntry<"outputs">
  | CollectionEntry<"courses">
  | CollectionEntry<"artifacts">;

export type RouteNode = {
  id: string;
  collection: RouteCollection;
  slug: string;
  title: string;
  href: string;
  kind?: string;
  status?: string;
  visibility?: string;
  summary?: string;
  featured: boolean;
  ahlRecordId?: string;
  ahlRecordType?: string;
  provenance?: {
    ahlPublicRecord?: string;
    note?: string;
    sourceLinkCount: number;
    noteLinkCount: number;
    commentaryLinkCount: number;
  };
};

export type RouteEdge = {
  source: string;
  target: string;
  relation: string;
};

export type RouteGraph = {
  generatedAt: string;
  note: string;
  nodes: RouteNode[];
  edges: RouteEdge[];
};

export type RouteLink = {
  id: string;
  href: string;
  title: string;
  collection: RouteCollection;
  relation: string;
  direction: "outgoing" | "incoming";
  status?: string;
};

type CollectionsByName = Record<RouteCollection, RouteEntry[]>;

const routeCollections: RouteCollection[] = ["constellations", "outputs", "courses", "artifacts"];

const collectionLabels: Record<RouteCollection, string> = {
  constellations: "Writing",
  outputs: "Outputs",
  courses: "Teaching",
  artifacts: "Building",
};

export function routeNodeId(collection: RouteCollection, slug: string) {
  return `${collection}:${slug}`;
}

export function routeHref(collection: RouteCollection, _slug?: string) {
  if (collection === "courses") {
    return "/teaching";
  }

  if (collection === "artifacts") {
    return "/building";
  }

  return "/writing";
}

export function routeCollectionLabel(collection: RouteCollection) {
  return collectionLabels[collection];
}

export async function getRouteGraph(): Promise<RouteGraph> {
  const collections = Object.fromEntries(
    await Promise.all(
      routeCollections.map(async (collection) => [
        collection,
        (await getCollection(collection)).filter(
          (entry) => entry.data.visibility === "public" && isPublicRouteEntry(collection, entry)
        ),
      ])
    )
  ) as CollectionsByName;

  return buildRouteGraph(collections);
}

export function routeLinksFor(graph: RouteGraph, collection: RouteCollection, slug: string): RouteLink[] {
  const id = routeNodeId(collection, slug);
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  const links = graph.edges
    .filter((edge) => edge.source === id || edge.target === id)
    .map((edge) => {
      const direction = edge.source === id ? "outgoing" : "incoming";
      const linkedNode = nodeMap.get(direction === "outgoing" ? edge.target : edge.source);

      if (!linkedNode) {
        return undefined;
      }

      return {
        id: linkedNode.id,
        href: linkedNode.href,
        title: linkedNode.title,
        collection: linkedNode.collection,
        relation: edge.relation,
        direction,
        status: linkedNode.status,
      };
    })
    .filter(Boolean) as RouteLink[];

  const dedupedLinks = new Map<string, RouteLink>();

  for (const link of links) {
    const existingLink = dedupedLinks.get(link.id);

    if (!existingLink || (existingLink.direction === "incoming" && link.direction === "outgoing")) {
      dedupedLinks.set(link.id, link);
    }
  }

  return [...dedupedLinks.values()].sort((a, b) => {
    const collectionOrder = routeCollections.indexOf(a.collection) - routeCollections.indexOf(b.collection);
    return collectionOrder || a.title.localeCompare(b.title);
  });
}

function buildRouteGraph(collections: CollectionsByName): RouteGraph {
  const nodes = routeCollections.flatMap((collection) =>
    collections[collection].map((entry) => entryToNode(collection, entry))
  );
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edgeMap = new Map<string, RouteEdge>();

  for (const collection of routeCollections) {
    for (const entry of collections[collection]) {
      const sourceSlug = slugFor(entry);
      const source = routeNodeId(collection, sourceSlug);
      const data = entry.data;

      for (const slug of data.constellations ?? []) {
        addEdge(edgeMap, nodeIds, source, routeNodeId("constellations", slug), relationFor(collection, "constellations"));
      }

      for (const slug of data.relatedOutputs ?? []) {
        addEdge(edgeMap, nodeIds, source, routeNodeId("outputs", slug), relationFor(collection, "outputs"));
      }

      for (const slug of data.relatedArtifacts ?? []) {
        addEdge(edgeMap, nodeIds, source, routeNodeId("artifacts", slug), relationFor(collection, "artifacts"));
      }

      for (const slug of data.relatedCourses ?? []) {
        addEdge(edgeMap, nodeIds, source, routeNodeId("courses", slug), relationFor(collection, "courses"));
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    note: "Static public route graph for dougstark.tech. Private knowledgebase content should target these public node ids, slugs, and hrefs without importing private archive material into this repository.",
    nodes,
    edges: [...edgeMap.values()].sort(
      (a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target) || a.relation.localeCompare(b.relation)
    ),
  };
}

function entryToNode(collection: RouteCollection, entry: RouteEntry): RouteNode {
  const slug = slugFor(entry);

  return {
    id: routeNodeId(collection, slug),
    collection,
    slug,
    title: entry.data.title,
    href: nodeHref(collection, entry, slug),
    kind: entry.data.kind,
    status: entry.data.status,
    visibility: entry.data.visibility,
    summary: entry.data.summary,
    featured: entry.data.featured ?? false,
    ahlRecordId: entry.data.ahlRecordId,
    ahlRecordType: entry.data.ahlRecordType,
    provenance: entry.data.ahlRecordId
      ? {
          ahlPublicRecord: entry.data.ahlPublicRecord,
          note: entry.data.provenanceNote,
          sourceLinkCount: entry.data.sourceLinkCount ?? 0,
          noteLinkCount: entry.data.noteLinkCount ?? 0,
          commentaryLinkCount: entry.data.commentaryLinkCount ?? 0,
        }
      : undefined,
  };
}

function isPublicRouteEntry(collection: RouteCollection, entry: RouteEntry) {
  if (collection === "constellations") {
    return false;
  }

  if (collection === "courses") {
    return entry.data.kind === "course";
  }

  if (collection === "artifacts") {
    return entry.data.kind !== "design container";
  }

  if (collection === "outputs") {
    return entry.data.status === "closed";
  }

  return true;
}

function nodeHref(collection: RouteCollection, entry: RouteEntry, slug: string) {
  if (collection === "outputs") {
    return entry.data.publicUrl ?? "/writing";
  }

  if (collection === "artifacts") {
    return entry.data.publicUrl ?? "/building";
  }

  if (collection === "constellations") {
    return "/writing";
  }

  if (collection === "courses") {
    return entry.data.publicUrl ?? "/teaching";
  }

  return routeHref(collection, slug);
}

function addEdge(edgeMap: Map<string, RouteEdge>, nodeIds: Set<string>, source: string, target: string, relation: string) {
  if (source === target || !nodeIds.has(source) || !nodeIds.has(target)) {
    return;
  }

  const key = `${source}->${target}:${relation}`;
  edgeMap.set(key, { source, target, relation });
}

function relationFor(source: RouteCollection, target: RouteCollection) {
  if (target === "constellations") {
    return "belongs to";
  }

  if (target === "outputs") {
    return source === "constellations" ? "surfaces as" : "connects to output";
  }

  if (target === "courses") {
    return source === "constellations" ? "teaches through" : "connects to course";
  }

  return source === "constellations" ? "materializes as" : "connects to artifact";
}

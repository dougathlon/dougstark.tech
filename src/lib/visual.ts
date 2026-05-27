const patternNames = [
  "lattice",
  "oscillon",
  "cellular",
  "contour",
  "orbit",
  "weave",
  "stochastic",
  "fold",
  "recursive",
  "plotter",
  "interference",
  "permutation",
  "register",
  "moire",
  "persona",
  "circuit",
  "network",
  "manifold",
  "axonometric",
];

const semanticPatterns: Array<[RegExp, string]> = [
  [/profile|personnel|person|contact|address|cv|credential/, "wire-personnel"],
  [/game-analysis|video-game-analysis/, "wire-game-analysis"],
  [/game-studies|intro-to-video-game-studies/, "wire-game-studies"],
  [/critical-theory/, "wire-critical-theory"],
  [/esports|tournament|competition/, "wire-esports"],
  [/the-digital|digital|analog|interface|screen/, "wire-digital"],
  [/taste-and-ai|taste|aesthetic|stiegler|discrete-image|synthetic-image/, "wire-taste-ai"],
  [/judgment|output-spool/, "wire-judgment"],
  [/cosmoludics|magic-circulation|wynter|james|cricket|ceremony|caribbean/, "wire-cosmoludics"],
  [/preenact|protective-play|instruction-manuals|risk|operational|military|managerial/, "wire-preenactment"],
  [/science-fiction|speculative|butler|parable|pynchon|deeparcher|hyperempathy/, "wire-speculation"],
  [/simema|autoplay|self-playing|radical-passivity|automation|art-of-behavior/, "wire-autoplay"],
  [/gaming-habits|autopraxeology|sudnow|habit|skill|graceful|bodily/, "wire-habit"],
  [/games-as-models|model-models|models|epistem|simondon|fictional-games|4d-toys|speculative-adaptation|brecht/, "wire-models"],
  [/tokenizer|token/, "wire-tokenizer"],
  [/askesis|fluxus|fluxercise|exercise|practice|attention|media-philosophy/, "wire-askesis"],
  [/game-pedagogy|room-to-play|gameroom|basement|greenlaw/, "wire-pedagogy"],
  [/video-game-novels|ludic-literature|ready-player-one|novel|literature/, "wire-novel"],
  [/aural|sound/, "wire-sound"],
  [/platform-orthographer|orthograph/, "wire-platform"],
  [/human-mode/, "wire-human-mode"],
  [/latent-levels|latent/, "wire-latent-levels"],
  [/synthesizing-pov|perspective|vision|pov/, "wire-perspective"],
  [/synthetic|ai|lab|agent|token/, "wire-synthetic"],
  [/teaching|course|pedagogy|student|syllab|curriculum/, "wire-book"],
  [/game|simema|play|latent|artifact|design|prototype/, "wire-game"],
  [/askesis|fluxus|practice|attention|training/, "wire-person"],
  [/habit|skill|sudnow|graceful|bodily/, "wire-game"],
  [/wynter|james|race|ceremony|caribbean/, "wire-system"],
  [/science|fiction|cosmo|cricket|orbit|circulation/, "wire-system"],
  [/preenact|risk|protective|simulation|military|operation/, "wire-system"],
  [/model|epistem|simondon|image/, "wire-screen"],
  [/output|publication|talk|essay|spool/, "wire-document"],
  [/archive|miscellany|older|novel|literature/, "wire-card"],
];

export function patternFor(seed: string | undefined) {
  const value = seed ?? "public-card";
  const salt = Number(value.match(/-(\d+)$/)?.[1] ?? 0);
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) % 9973;
  }

  const semanticPattern = semanticPatterns.find(([matcher]) => matcher.test(value.toLowerCase()))?.[1];
  const pattern = semanticPattern ?? patternNames[(hash + salt * 3) % patternNames.length];

  return `${pattern} phase-${
    (Math.floor(hash / patternNames.length) + salt) % 6
  } slot-${salt % 12}`;
}

export function coursePatternForSlug(slug: string) {
  if (slug.includes("game-analysis") || slug.includes("video-game-analysis")) {
    return "wire-game-analysis phase-1 slot-1";
  }

  if (slug.includes("game-studies") || slug.includes("intro-to-video-game-studies")) {
    return "wire-game-studies phase-2 slot-6";
  }

  if (slug.includes("esports")) {
    return "wire-esports phase-0 slot-0";
  }

  if (slug.includes("critical-theory")) {
    return "wire-critical-theory phase-2 slot-2";
  }

  if (slug.includes("taste-and-ai")) {
    return "wire-taste-ai phase-3 slot-3";
  }

  if (slug.includes("digital")) {
    return "wire-digital phase-4 slot-4";
  }

  return "wire-card phase-5 slot-5";
}

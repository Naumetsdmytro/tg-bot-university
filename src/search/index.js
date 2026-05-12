import Fuse from "fuse.js";

let fuse = null;
let itemsRef = [];

const FUSE_OPTIONS = {
  keys: [
    { name: "question", weight: 0.5 },
    { name: "keywords", weight: 0.35 },
    { name: "answer", weight: 0.15 },
  ],
  includeScore: true,
  ignoreLocation: true,
  threshold: 0.5,
  minMatchCharLength: 2,
};

export function buildIndex(items) {
  itemsRef = items;
  fuse = new Fuse(items, FUSE_OPTIONS);
}

// Lower Fuse score = better match (0 = perfect).
// Аggregated score we compute below is inverted: HIGHER = better.
const ACCEPT_AGG = 0.55;
const SUGGEST_AGG = 0.35;

export function search(query, limit = 5) {
  if (!fuse) throw new Error("Search index is not initialised.");

  const cleaned = normalize(query);
  if (!cleaned) return { best: null, suggestions: [] };

  const tokens = cleaned
    .split(/[\s,.;:!?()"'«»\-–—]+/u)
    .filter((t) => t.length >= 3);

  const scoreByItem = new Map();

  const accumulate = (results, weight) => {
    for (const r of results) {
      const inv = 1 - r.score;
      const prev = scoreByItem.get(r.item.id) || { item: r.item, total: 0 };
      prev.total += inv * weight;
      scoreByItem.set(r.item.id, prev);
    }
  };

  accumulate(fuse.search(cleaned, { limit: 10 }), 1.0);
  for (const token of tokens) {
    accumulate(fuse.search(token, { limit: 10 }), 0.7);
  }

  if (scoreByItem.size === 0) return { best: null, suggestions: [] };

  const ranked = [...scoreByItem.values()].sort((a, b) => b.total - a.total);
  const top = ranked[0];
  const best = top.total >= ACCEPT_AGG ? top.item : null;
  const suggestions = ranked
    .slice(1, 1 + limit)
    .filter((r) => r.total >= SUGGEST_AGG)
    .map((r) => r.item);

  return {
    best,
    suggestions: suggestions.slice(0, 3),
    topScore: top.total,
    topItem: top.item,
  };
}

export function getById(id) {
  return itemsRef.find((it) => it.id === id) || null;
}

export function getByCategory(category) {
  return itemsRef.filter((it) => it.category === category);
}

function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[«»"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

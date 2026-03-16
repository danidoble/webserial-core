#!/usr/bin/env node
/**
 * @file algolia-index.mjs
 * @description Indexes all VitePress docs into Algolia using the DocSearch
 * record format expected by @docsearch/js (used by VitePress's Algolia provider).
 *
 * Usage:
 *   node scripts/algolia-index.mjs
 *
 * Required environment variables:
 *   ALGOLIA_APP_ID        — Algolia application ID
 *   ALGOLIA_WRITE_API_KEY — Admin API key (write access). NOT the search-only key.
 *   ALGOLIA_INDEX_NAME    — Name of the Algolia index to populate
 *
 * Optional:
 *   DOCS_BASE  — URL base path (e.g. "/webserial-core/"). Defaults to "/".
 *   DOCS_URL   — Full site origin (e.g. "https://danidoble.github.io").
 *                When set, record URLs will be absolute (required for cross-domain).
 */

import { algoliasearch } from "algoliasearch";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DOCS_DIR = join(ROOT, "docs");

// ---------------------------------------------------------------------------
// Load .env (local development) — Node.js does not auto-load .env files
// ---------------------------------------------------------------------------
const envFile = join(ROOT, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    // CI environment secrets take priority over .env values
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

// ---------------------------------------------------------------------------
// Env validation
// ---------------------------------------------------------------------------

const {
  ALGOLIA_APP_ID,
  ALGOLIA_WRITE_API_KEY,
  ALGOLIA_INDEX_NAME,
  DOCS_BASE,
  DOCS_URL,
} = process.env;

if (!ALGOLIA_APP_ID || !ALGOLIA_WRITE_API_KEY || !ALGOLIA_INDEX_NAME) {
  console.error(
    "\n⚠  Algolia indexing skipped — missing environment variables.\n" +
      "   Set ALGOLIA_APP_ID, ALGOLIA_WRITE_API_KEY and ALGOLIA_INDEX_NAME to enable indexing.\n",
  );
  process.exit(0); // exit 0 so CI does not fail if secrets are not configured
}

const base = (DOCS_BASE ?? "/").replace(/\/$/, ""); // strip trailing slash
const origin = (DOCS_URL ?? "").replace(/\/$/, ""); // e.g. "https://danidoble.github.io"

// ---------------------------------------------------------------------------
// Section label lookup (used for hierarchy.lvl0)
// ---------------------------------------------------------------------------

/** @param {string} rel - path relative to docs/ e.g. "es/guide/getting-started.md" */
function getSectionLabel(rel) {
  const isEs = rel.startsWith("es/");
  const clean = isEs ? rel.slice(3) : rel;

  if (clean.startsWith("guide/")) return isEs ? "Guía" : "Guide";
  if (clean.startsWith("api/")) return isEs ? "Referencia API" : "API Reference";
  if (clean.startsWith("examples/")) return isEs ? "Ejemplos" : "Examples";
  if (clean === "demos.md" || clean.startsWith("demos"))
    return isEs ? "Demos interactivos" : "Demos";
  if (clean === "index.md") return "webserial-core";
  if (clean.startsWith("v1/")) return "v1 (Legacy)";
  return "webserial-core";
}

// ---------------------------------------------------------------------------
// File walker
// ---------------------------------------------------------------------------

/** @param {string} dir  @returns {string[]} */
function walkDocs(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    if (entry === ".vitepress" || entry === "node_modules") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walkDocs(full));
    } else if (entry.endsWith(".md")) {
      results.push(full);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

/** @param {string} absPath @returns {string} path portion of the URL */
function toPath(absPath) {
  let rel = relative(DOCS_DIR, absPath).replace(/\\/g, "/");
  if (rel === "index.md") return base + "/";
  rel = rel.replace(/\.md$/, "");
  if (rel.endsWith("/index")) rel = rel.slice(0, -"/index".length) + "/";
  return base + "/" + rel;
}

/** @param {string} path @returns {string} */
function toUrl(path) {
  return origin + path;
}

/** @param {string} absPath @returns {"es"|"en"} */
function getLang(absPath) {
  return relative(DOCS_DIR, absPath).replace(/\\/g, "/").startsWith("es/")
    ? "es"
    : "en";
}

// ---------------------------------------------------------------------------
// Markdown helpers
// ---------------------------------------------------------------------------

/** @param {string} text @returns {string} */
function stripInline(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/_+([^_]+)_+/g, "$1")
    .trim();
}

/** Remove noise from prose text @param {string} raw @returns {string} */
function extractProse(raw) {
  return raw
    .replace(/```[\s\S]*?```/g, "") // fenced code blocks
    .replace(/`[^`]+`/g, "") // inline code
    .replace(/^\|.+\|$/gm, "") // table rows
    .replace(/^>+\s*/gm, "") // blockquote markers
    .replace(/^#+\s+.+$/gm, "") // headings
    .replace(/!\[.*?\]\(.*?\)/g, "") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → text
    .replace(/\s+/g, " ")
    .trim();
}

/** @param {string} heading @returns {string} */
function toAnchor(heading) {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

// ---------------------------------------------------------------------------
// DocSearch record builder
//
// @docsearch/js (used by VitePress) expects records in this shape:
//   { objectID, url, anchor, content, hierarchy: { lvl0..lvl6 }, type, lang }
//
// type values: "lvl1" (page), "lvl2" (h2 heading), "content" (paragraph)
// hierarchy.lvl0 = site section (Guide / API / Examples …)
// hierarchy.lvl1 = page title (h1)
// hierarchy.lvl2 = section heading (h2)
// ---------------------------------------------------------------------------

/**
 * @param {string} absPath
 * @returns {object[]} DocSearch-compatible Algolia records
 */
function parseFile(absPath) {
  const raw = readFileSync(absPath, "utf8");
  const pagePath = toPath(absPath);
  const lang = getLang(absPath);
  const rel = relative(DOCS_DIR, absPath).replace(/\\/g, "/");
  const lvl0 = getSectionLabel(rel);

  const records = [];

  // Strip YAML frontmatter
  const body = raw.replace(/^---[\s\S]*?---\n?/, "");
  const lines = body.split("\n");

  // Page title from first h1
  const h1 = lines.find((l) => /^#\s/.test(l));
  const lvl1 = h1 ? stripInline(h1.replace(/^#\s+/, "")) : pagePath;

  // Emit a lvl1 record for the page itself (shows as the "page" result)
  records.push({
    objectID: `${pagePath}#_page`,
    url: toUrl(pagePath),
    anchor: null,
    content: null,
    hierarchy: { lvl0, lvl1, lvl2: null, lvl3: null, lvl4: null, lvl5: null, lvl6: null },
    type: "lvl1",
    lang,
  });

  // Collect h2 heading positions
  /** @type {{ heading: string; anchor: string; lineIdx: number }[]} */
  const h2s = [];
  lines.forEach((line, idx) => {
    const m = line.match(/^##\s+(.+)$/);
    if (m) h2s.push({ heading: stripInline(m[1]), anchor: toAnchor(m[1]), lineIdx: idx });
  });

  if (h2s.length === 0) {
    // No h2 — index full body prose as a single content record
    const content = extractProse(body).slice(0, 500);
    if (content) {
      records.push({
        objectID: `${pagePath}#_content`,
        url: toUrl(pagePath),
        anchor: null,
        content,
        hierarchy: { lvl0, lvl1, lvl2: null, lvl3: null, lvl4: null, lvl5: null, lvl6: null },
        type: "content",
        lang,
      });
    }
    return records;
  }

  // For each h2: emit a lvl2 heading record + content records for its paragraphs
  h2s.forEach(({ heading, anchor, lineIdx }, i) => {
    const nextIdx = h2s[i + 1]?.lineIdx ?? lines.length;
    const lvl2 = heading;
    const sectionUrl = `${pagePath}#${anchor}`;

    // lvl2 heading record
    records.push({
      objectID: `${pagePath}#${anchor}`,
      url: toUrl(sectionUrl),
      anchor,
      content: null,
      hierarchy: { lvl0, lvl1, lvl2, lvl3: null, lvl4: null, lvl5: null, lvl6: null },
      type: "lvl2",
      lang,
    });

    // Content under this h2 — split into paragraphs for better snippet quality
    const sectionBody = lines.slice(lineIdx + 1, nextIdx).join("\n");
    const prose = extractProse(sectionBody);

    if (prose) {
      // Split into ~200-char chunks so snippets are readable
      const chunks = prose.match(/.{1,200}(?:\s|$)/g) ?? [prose];
      chunks.forEach((chunk, ci) => {
        const text = chunk.trim();
        if (!text) return;
        records.push({
          objectID: `${pagePath}#${anchor}_c${ci}`,
          url: toUrl(sectionUrl),
          anchor,
          content: text,
          hierarchy: { lvl0, lvl1, lvl2, lvl3: null, lvl4: null, lvl5: null, lvl6: null },
          type: "content",
          lang,
        });
      });
    }
  });

  return records;
}

// ---------------------------------------------------------------------------
// Algolia index settings (DocSearch-compatible)
// ---------------------------------------------------------------------------

const INDEX_SETTINGS = {
  searchableAttributes: [
    "unordered(hierarchy.lvl0)",
    "unordered(hierarchy.lvl1)",
    "unordered(hierarchy.lvl2)",
    "unordered(hierarchy.lvl3)",
    "unordered(hierarchy.lvl4)",
    "unordered(hierarchy.lvl5)",
    "unordered(hierarchy.lvl6)",
    "content",
  ],
  attributesForFaceting: ["searchable(type)", "searchable(lang)"],
  attributesToRetrieve: [
    "anchor",
    "content",
    "hierarchy",
    "url",
    "lang",
    "type",
  ],
  attributesToHighlight: ["hierarchy", "content"],
  attributesToSnippet: ["content:25"],
  distinct: true,
  attributeForDistinct: "url",
  customRanking: [
    "desc(weight.pageRank)",
    "desc(weight.level)",
    "asc(weight.position)",
  ],
  ranking: [
    "words",
    "filters",
    "typo",
    "attribute",
    "proximity",
    "exact",
    "custom",
  ],
  minWordSizefor1Typo: 3,
  minWordSizefor2Typos: 7,
  allowTyposOnNumericTokens: false,
  minProximity: 1,
  ignorePlurals: true,
  advancedSyntax: true,
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log("\n📚  webserial-core — Algolia indexing");
console.log(`   index:   ${ALGOLIA_INDEX_NAME}`);
console.log(`   app-id:  ${ALGOLIA_APP_ID}`);
console.log(`   base:    ${base || "/"}`);
console.log(`   origin:  ${origin || "(relative paths)"}\n`);

const files = walkDocs(DOCS_DIR);
console.log(`   Found ${files.length} markdown files…`);

const allObjects = [];
for (const file of files) {
  try {
    allObjects.push(...parseFile(file));
  } catch (err) {
    console.warn(`   ⚠ Skipping ${relative(DOCS_DIR, file)}: ${err.message}`);
  }
}
console.log(`   Generated ${allObjects.length} DocSearch records.`);

const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_WRITE_API_KEY);

try {
  // 1. Apply DocSearch-compatible index settings
  console.log("\n   Configuring index settings…");
  await client.setSettings({
    indexName: ALGOLIA_INDEX_NAME,
    indexSettings: INDEX_SETTINGS,
  });
  console.log("   ✔ Index settings updated.");

  // 2. Replace all objects (clearObjects + saveObjects atomically)
  console.log("   Uploading records…");
  await client.clearObjects({ indexName: ALGOLIA_INDEX_NAME });
  await client.saveObjects({
    indexName: ALGOLIA_INDEX_NAME,
    objects: allObjects,
  });

  console.log(
    `\n✅  Successfully indexed ${allObjects.length} records into "${ALGOLIA_INDEX_NAME}".\n`,
  );
} catch (err) {
  console.error("\n❌  Algolia indexing failed:", err.message);
  process.exit(1);
}


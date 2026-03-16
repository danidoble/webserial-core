#!/usr/bin/env node
/**
 * @file publish.mjs
 * @description Automated release pipeline for webserial-core.
 *
 * Usage:
 *   node scripts/publish.mjs [--patch | --minor | --major] [--dry-run] [--tag <dist-tag>]
 *
 * Steps:
 *   1. Validate working directory is clean (unless --dry-run)
 *   2. Run ESLint (zero warnings allowed)
 *   3. Type-check with tsc --noEmit
 *   4. Build with Vite
 *   5. Bump version in package.json
 *   6. Prepend entry to CHANGELOG.md
 *   7. Commit, tag, and push (unless --dry-run)
 *   8. Publish to npm (unless --dry-run)
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

/**
 * Detect the preferred package manager.
 * Uses bun if available, falls back to npm.
 * bun publish is fully compatible with the npm registry and does not require
 * a package-lock.json — bun.lock is sufficient.
 * @returns {"bun" | "npm"}
 */
function detectPM() {
  try {
    execSync("bun --version", { stdio: "ignore" });
    return "bun";
  } catch {
    return "npm";
  }
}

/** Package manager: "bun" or "npm" */
const pm = detectPM();
/** Executor prefix: "bun x" (like npx) or "npx" */
const px = pm === "bun" ? "bun x" : "npx";

/**
 * Run a shell command synchronously, streaming output to the terminal.
 * @param {string} cmd - Command to execute.
 * @param {string} [label] - Human-readable label shown before the command.
 */
function run(cmd, label) {
  if (label) {
    console.log(`\n▶ ${label}`);
  }
  console.log(`  $ ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: "inherit" });
}

/**
 * Read and parse ROOT/package.json.
 * @returns {{ version: string, name: string } & Record<string, unknown>}
 */
function readPkg() {
  return JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
}

/**
 * Write an object back to ROOT/package.json (2-space indent, trailing newline).
 * @param {Record<string, unknown>} pkg
 */
function writePkg(pkg) {
  writeFileSync(
    resolve(ROOT, "package.json"),
    JSON.stringify(pkg, null, 2) + "\n",
    "utf8",
  );
}

/**
 * Bump a semver string.
 *
 * Pre-release behaviour:
 *   - If the current version has a pre-release tag (e.g. "-dev", "-alpha.1",
 *     "-beta.2"), the tag is preserved and its numeric counter is incremented.
 *     e.g.  2.0.0-dev      → 2.0.1-dev        (patch)
 *           2.0.0-alpha.1  → 2.0.0-alpha.2     (patch — counter bump only)
 *           2.0.0-alpha.1  → 2.1.0-alpha.1     (minor — base bump, counter resets to 1)
 *           2.0.0-dev      → 3.0.0-dev         (major)
 *   - Simple bare tags without a numeric suffix (e.g. "-dev") are kept as-is
 *     when only the patch counter changes; the base semver is incremented.
 *   - Pass --stable to strip the pre-release tag and produce a clean release.
 *
 * @param {string} version - Current semver (e.g. "2.1.3" or "2.0.0-alpha.1").
 * @param {"patch"|"minor"|"major"} bump
 * @param {boolean} [stable=false] - When true, drop the pre-release tag.
 * @returns {string} New semver string.
 */
function bumpVersion(version, bump, stable = false) {
  const dashIdx = version.indexOf("-");
  const base =
    dashIdx !== -1 ? version.slice(0, dashIdx) : version.split("+")[0];
  const prerelease =
    dashIdx !== -1 ? version.slice(dashIdx + 1).split("+")[0] : null;

  const parts = base.split(".").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`Cannot parse version "${version}"`);
  }
  let [major, minor, patch] = parts;

  // No pre-release tag or explicitly requesting stable → plain semver bump
  if (!prerelease || stable) {
    if (bump === "major") {
      major += 1;
      minor = 0;
      patch = 0;
    } else if (bump === "minor") {
      minor += 1;
      patch = 0;
    } else {
      patch += 1;
    }
    return `${major}.${minor}.${patch}`;
  }

  // Pre-release is present → preserve the tag
  const counterMatch = prerelease.match(/^(.*?)\.?(\d+)$/);

  if (counterMatch) {
    // Tagged with a numeric counter (e.g. alpha.1, beta.3, rc.2)
    const label = counterMatch[1]; // "alpha", "beta", "rc", …
    const counter = Number(counterMatch[2]);

    if (bump === "patch") {
      // Only increment the counter; base semver stays the same
      return `${major}.${minor}.${patch}-${label ? label + "." : ""}${counter + 1}`;
    }
    // minor / major: bump the base and reset the counter to 1
    if (bump === "minor") {
      minor += 1;
      patch = 0;
    } else {
      major += 1;
      minor = 0;
      patch = 0;
    }
    return `${major}.${minor}.${patch}-${label ? label + "." : ""}1`;
  }

  // Bare tag without a counter (e.g. "-dev", "-next") — always bump base
  if (bump === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bump === "minor") {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}-${prerelease}`;
}

/**
 * Prepend a new section to ROOT/CHANGELOG.md. Creates the file if absent.
 * @param {string} version - New version being released.
 */
function updateChangelog(version) {
  const changelogPath = resolve(ROOT, "CHANGELOG.md");
  const date = new Date().toISOString().slice(0, 10);
  const heading = `## [${version}] — ${date}\n\n- Release ${version}\n\n`;

  if (existsSync(changelogPath)) {
    const existing = readFileSync(changelogPath, "utf8");
    // Preserve the top-level title if present (first line starting with #).
    const firstNewline = existing.indexOf("\n");
    const firstLine =
      firstNewline !== -1 ? existing.slice(0, firstNewline + 1) : "";
    const rest =
      firstNewline !== -1 ? existing.slice(firstNewline + 1) : existing;
    if (firstLine.startsWith("# ")) {
      writeFileSync(changelogPath, firstLine + "\n" + heading + rest, "utf8");
    } else {
      writeFileSync(changelogPath, heading + existing, "utf8");
    }
  } else {
    writeFileSync(changelogPath, `# Changelog\n\n${heading}`, "utf8");
  }
  console.log(`  ✔ CHANGELOG.md updated`);
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);

/** @type {"patch"|"minor"|"major"} */
const bump = /** @type {any} */ (
  argv.find((a) => ["--patch", "--minor", "--major"].includes(a))?.slice(2) ??
    "patch"
);

const dryRun = argv.includes("--dry-run");

/**
 * --stable: drop any pre-release tag and produce a clean stable version.
 * Without this flag, a pre-release version (e.g. 2.0.0-alpha.1) stays
 * pre-release after bumping (e.g. 2.0.0-alpha.2 or 2.0.1-alpha.1).
 */
const stable = argv.includes("--stable");

const tagArgIndex = argv.indexOf("--tag");
const distTag = tagArgIndex !== -1 ? argv[tagArgIndex + 1] : "latest";

if (!distTag || distTag.startsWith("--")) {
  console.error("Error: --tag requires a value (e.g. --tag beta)");

  process.exit(1);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log(`\n🚀  webserial-core release pipeline`);
console.log(`   bump:     ${bump}`);
console.log(`   stable:   ${stable}`);
console.log(`   dist-tag: ${distTag}`);
console.log(`   dry-run:  ${dryRun}`);

// 1. Guard: clean working tree
if (!dryRun) {
  const status = execSync("git status --porcelain", { cwd: ROOT })
    .toString()
    .trim();
  if (status) {
    console.error(
      "\nError: working directory has uncommitted changes.\n" +
        "Commit or stash your changes before releasing, or pass --dry-run.\n",
    );

    process.exit(1);
  }
}

// 2. Lint
run(`${px} eslint . --max-warnings 0`, "Lint");

// 3. Type-check
run(`${px} tsc --noEmit`, "Type-check");

// 4. Build
run(`${px} vite build`, "Build");

// 5. Bump version
const pkg = readPkg();
const oldVersion = pkg.version;
const newVersion = bumpVersion(oldVersion, bump, stable);
pkg.version = newVersion;
writePkg(pkg);
console.log(`\n  ✔ Bumped ${oldVersion} → ${newVersion}`);

// 6. Update CHANGELOG
updateChangelog(newVersion);

if (dryRun) {
  console.log(
    "\n✅  Dry-run complete. Version bumped and changelog updated locally.\n" +
      "   No commits, tags, pushes, or npm publish were performed.\n",
  );

  process.exit(0);
}

// 7. Commit + tag + push
run(`git add package.json CHANGELOG.md`, "Stage release files");
run(`git commit -m "chore: release v${newVersion}"`, "Commit");
run(`git tag v${newVersion} -m "v${newVersion}"`, "Tag");
run("git push", "Push commits");
run("git push --tags", "Push tag");

// 8. Publish
// bun publish works identically to npm publish and does NOT require package-lock.json.
run(
  `${pm} publish --access public --tag ${distTag}`,
  `Publish to npm registry (via ${pm})`,
);

// 9. Reindex Algolia docs (optional — only runs when ALGOLIA_WRITE_API_KEY is set)
if (
  process.env.ALGOLIA_APP_ID &&
  process.env.ALGOLIA_WRITE_API_KEY &&
  process.env.ALGOLIA_INDEX_NAME
) {
  run("node scripts/algolia-index.mjs", "Reindex Algolia docs");
} else {
  console.log(
    "\n  ⚠  Algolia reindex skipped — set ALGOLIA_APP_ID, ALGOLIA_WRITE_API_KEY and ALGOLIA_INDEX_NAME to enable.\n",
  );
}

console.log(`\n✅  Released webserial-core@${newVersion} (tag: ${distTag})\n`);

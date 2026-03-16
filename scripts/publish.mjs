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
 * @param {string} version - Current semver (e.g. "2.1.3").
 * @param {"patch"|"minor"|"major"} bump
 * @returns {string} New semver string.
 */
function bumpVersion(version, bump) {
  // Strip any pre-release/build-metadata suffix before bumping.
  const base = version.split("-")[0].split("+")[0];
  const parts = base.split(".").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`Cannot parse version "${version}"`);
  }
  let [major, minor, patch] = parts;
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
// eslint-disable-next-line no-undef
const argv = process.argv.slice(2);

/** @type {"patch"|"minor"|"major"} */
const bump = /** @type {any} */ (
  argv.find((a) => ["--patch", "--minor", "--major"].includes(a))?.slice(2) ??
    "patch"
);

const dryRun = argv.includes("--dry-run");

const tagArgIndex = argv.indexOf("--tag");
const distTag = tagArgIndex !== -1 ? argv[tagArgIndex + 1] : "latest";

if (!distTag || distTag.startsWith("--")) {
  console.error("Error: --tag requires a value (e.g. --tag beta)");
  // eslint-disable-next-line no-undef
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log(`\n🚀  webserial-core release pipeline`);
console.log(`   bump:    ${bump}`);
console.log(`   dist-tag: ${distTag}`);
console.log(`   dry-run: ${dryRun}`);

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
    // eslint-disable-next-line no-undef
    process.exit(1);
  }
}

// 2. Lint
run("npx eslint . --max-warnings 0", "Lint");

// 3. Type-check
run("npx tsc --noEmit", "Type-check");

// 4. Build
run("npx vite build", "Build");

// 5. Bump version
const pkg = readPkg();
const oldVersion = pkg.version;
const newVersion = bumpVersion(oldVersion, bump);
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
  // eslint-disable-next-line no-undef
  process.exit(0);
}

// 7. Commit + tag + push
run(`git add package.json CHANGELOG.md`, "Stage release files");
run(`git commit -m "chore: release v${newVersion}"`, "Commit");
run(`git tag v${newVersion} -m "v${newVersion}"`, "Tag");
run("git push", "Push commits");
run("git push --tags", "Push tag");

// 8. npm publish
run(`npm publish --access public --tag ${distTag}`, "Publish to npm");

console.log(`\n✅  Released webserial-core@${newVersion} (tag: ${distTag})\n`);

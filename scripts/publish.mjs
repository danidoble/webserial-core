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
import { createInterface } from "node:readline";
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

const dryRun = argv.includes("--dry-run");

// Non-interactive overrides (useful for CI).
// When ALL three are provided via flags, the interactive prompt is skipped.
const flagBump = /** @type {"patch"|"minor"|"major"|null} */ (
  argv.find((a) => ["--patch", "--minor", "--major"].includes(a))?.slice(2) ??
    null
);
const flagStable = argv.includes("--stable");
const tagArgIndex = argv.indexOf("--tag");
const flagDistTag = tagArgIndex !== -1 ? (argv[tagArgIndex + 1] ?? null) : null;

// ---------------------------------------------------------------------------
// Interactive prompt helpers
// ---------------------------------------------------------------------------

/** @param {string} question @returns {Promise<string>} */
function ask(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Build a menu of version choices from the current version.
 * @param {string} current
 * @returns {{ label: string; bump: "patch"|"minor"|"major"; stable: boolean; distTag: string; version: string }[]}
 */
function buildChoices(current) {
  const dashIdx = current.indexOf("-");
  const prerelease =
    dashIdx !== -1 ? current.slice(dashIdx + 1).split("+")[0] : null;

  /** @type {{ label: string; bump: "patch"|"minor"|"major"; stable: boolean; distTag: string }[]} */
  const combos = [];

  if (prerelease) {
    // Currently on a pre-release — offer counter/base bumps keeping the tag,
    // plus a "promote to stable" option.
    combos.push(
      {
        label: `patch  (keep ${prerelease})`,
        bump: "patch",
        stable: false,
        distTag: prerelease.split(".")[0],
      },
      {
        label: `minor  (keep ${prerelease})`,
        bump: "minor",
        stable: false,
        distTag: prerelease.split(".")[0],
      },
      {
        label: `major  (keep ${prerelease})`,
        bump: "major",
        stable: false,
        distTag: prerelease.split(".")[0],
      },
      {
        label: `patch  → stable`,
        bump: "patch",
        stable: true,
        distTag: "latest",
      },
      {
        label: `minor  → stable`,
        bump: "minor",
        stable: true,
        distTag: "latest",
      },
      {
        label: `major  → stable`,
        bump: "major",
        stable: true,
        distTag: "latest",
      },
    );
  } else {
    // Currently stable — offer plain bumps and pre-release variants.
    for (const bump of /** @type {const} */ (["patch", "minor", "major"])) {
      combos.push({
        label: `${bump}  (stable)`,
        bump,
        stable: true,
        distTag: "latest",
      });
    }
    for (const tag of ["alpha", "beta", "dev", "rc"]) {
      for (const bump of /** @type {const} */ (["patch", "minor", "major"])) {
        combos.push({
          label: `${bump}  → ${tag}`,
          bump,
          stable: false,
          distTag: tag,
        });
      }
    }
  }

  return combos.map((c) => ({
    ...c,
    version: bumpVersion(current, c.bump, c.stable),
  }));
}

// ---------------------------------------------------------------------------
// Main (async so we can await readline prompts)
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n🚀  webserial-core release pipeline`);
  console.log(`   dry-run: ${dryRun}\n`);

  const currentPkg = readPkg();
  const currentVersion = currentPkg.version;

  console.log(`   Current version: ${currentVersion}`);

  /** @type {"patch"|"minor"|"major"} */
  let bump;
  /** @type {boolean} */
  let stable;
  /** @type {string} */
  let distTag;
  /** @type {string} */
  let newVersion;

  const ciMode = flagBump !== null && flagDistTag !== null;

  if (ciMode) {
    // All flags provided — non-interactive (CI path)
    bump = flagBump;
    stable = flagStable;
    distTag = flagDistTag;
    newVersion = bumpVersion(currentVersion, bump, stable);
    console.log(`   New version:     ${newVersion}`);
    console.log(`   dist-tag:        ${distTag}`);
  } else {
    // Interactive path ─────────────────────────────────────────────────────
    const choices = buildChoices(currentVersion);

    console.log("\n   Available version bumps:\n");
    choices.forEach((c, i) => {
      console.log(
        `   [${String(i + 1).padStart(2)}]  ${c.version.padEnd(22)} ${c.label}`,
      );
    });
    console.log(`\n   [ c]  Custom version  (type your own)`);
    console.log(`   [ q]  Quit\n`);

    let chosen;
    while (true) {
      const input = await ask("   Select option: ");

      if (input.toLowerCase() === "q") {
        console.log("\n   Aborted.\n");
        process.exit(0);
      }

      if (input.toLowerCase() === "c") {
        const custom = await ask("   Enter exact version (e.g. 2.1.0-rc.1): ");
        if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(custom)) {
          console.log("   ✗ Invalid semver. Try again.");
          continue;
        }
        // eslint-disable-next-line no-useless-assignment
        chosen = null;
        newVersion = custom;
        // Derive distTag from pre-release part of custom version
        const pre = custom.includes("-")
          ? custom.split("-")[1].split(".")[0]
          : "latest";
        distTag = pre;
        // eslint-disable-next-line no-useless-assignment
        bump = "patch"; // unused but required for type
        // eslint-disable-next-line no-useless-assignment
        stable = !custom.includes("-");
        break;
      }

      const idx = parseInt(input, 10) - 1;
      if (isNaN(idx) || idx < 0 || idx >= choices.length) {
        console.log("   ✗ Invalid selection. Try again.");
        continue;
      }
      chosen = choices[idx];
      // eslint-disable-next-line no-useless-assignment
      bump = chosen.bump;
      // eslint-disable-next-line no-useless-assignment
      stable = chosen.stable;
      distTag = chosen.distTag;
      newVersion = chosen.version;
      break;
    }

    console.log(`\n   New version:     ${newVersion}`);
    console.log(`   dist-tag:        ${distTag}`);

    // Final confirmation
    const confirm = await ask(
      `\n   Confirm release v${newVersion} (dist-tag: ${distTag})? [y/N] `,
    );
    if (confirm.toLowerCase() !== "y") {
      console.log("\n   Aborted.\n");
      process.exit(0);
    }
  }

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

  // 5. Write version
  const pkg = readPkg();
  const oldVersion = pkg.version;
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

  console.log(
    `\n✅  Released webserial-core@${newVersion} (tag: ${distTag})\n`,
  );
}

main().catch((err) => {
  console.error("\n❌ ", err.message);
  process.exit(1);
});

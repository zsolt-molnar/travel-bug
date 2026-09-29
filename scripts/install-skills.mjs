#!/usr/bin/env node
/**
 * Restore GitHub Agent Skills into gitignored .agents/skills/
 * from skills-lock.json (npx skills experimental_install).
 *
 * Skip with: SKIP_SKILLS_INSTALL=1 pnpm i
 * Force:     pnpm skills:install  (or FORCE_SKILLS_INSTALL=1)
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = join(root, "skills-lock.json");
const agentsSkills = join(root, ".agents", "skills");

if (process.env.SKIP_SKILLS_INSTALL === "1") {
  console.log("[skills] SKIP_SKILLS_INSTALL=1 — skipping");
  process.exit(0);
}

if (!existsSync(lockPath)) {
  console.log("[skills] no skills-lock.json — skipping");
  process.exit(0);
}

const lock = JSON.parse(readFileSync(lockPath, "utf8"));
const expected = Object.keys(lock.skills || {});

if (expected.length === 0) {
  console.log("[skills] lockfile empty — skipping");
  process.exit(0);
}

const installed = existsSync(agentsSkills)
  ? readdirSync(agentsSkills, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
  : [];

const missing = expected.filter((name) => !installed.includes(name));

if (missing.length === 0 && process.env.FORCE_SKILLS_INSTALL !== "1") {
  console.log(
    `[skills] ${expected.length} locked skills already present in .agents/skills — skipping`,
  );
  process.exit(0);
}

if (missing.length) {
  console.log(`[skills] missing: ${missing.join(", ")}`);
}
console.log("[skills] restoring from skills-lock.json …");

const result = spawnSync(
  "npx",
  ["--yes", "skills", "experimental_install"],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, CI: process.env.CI || "1" },
    shell: process.platform === "win32",
  },
);

process.exit(result.status ?? 1);

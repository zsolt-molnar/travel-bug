#!/usr/bin/env node

/**
 * Start the full local Working POC stack (step-by-step, like build-mobile).
 *
 * Usage:
 *   pnpm start:dev
 *   pnpm start:dev -- --no-seed
 *   pnpm start:dev -- --apps-only
 *   pnpm start:dev -- --no-migrate
 *
 * Flags:
 *   --apps-only   Skip .env / Docker / migrate / seed; only run turbo dev
 *   --no-migrate  Skip db:migrate
 *   --no-seed     Skip db:seed
 */

import { spawn, spawnSync, execSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

const args = new Set(process.argv.slice(2).filter((a) => a !== "--"));
const appsOnly = args.has("--apps-only");
const noMigrate = args.has("--no-migrate");
const noSeed = args.has("--no-seed");

function run(command, options = {}) {
  console.log(`   $ ${command}`);
  execSync(command, {
    stdio: "inherit",
    cwd: rootDir,
    ...options,
  });
}

function runOk(command) {
  const result = spawnSync(command, {
    shell: true,
    cwd: rootDir,
    encoding: "utf8",
  });
  return result.status === 0;
}

function ensureEnv() {
  const envPath = resolve(rootDir, ".env");
  const examplePath = resolve(rootDir, ".env.example");

  if (existsSync(envPath)) {
    console.log("✅ .env already present");
    return;
  }

  if (!existsSync(examplePath)) {
    console.error("❌ Error: .env missing and .env.example not found");
    process.exit(1);
  }

  copyFileSync(examplePath, envPath);
  console.log("✅ Created .env from .env.example");
}

function ensureDocker() {
  if (!runOk("docker info >/dev/null 2>&1")) {
    console.error("❌ Error: Docker is not running. Start Docker Desktop and retry.\n");
    process.exit(1);
  }

  console.log("   Starting Postgres + Redis (wait for healthy)...");
  run("docker compose up -d --wait");
  console.log("✅ Docker services healthy");
}

function printBanner() {
  console.log(`
┌──────────────────────────────────────────────┐
│  Travel Bug — local Working POC              │
│  Traveler  http://localhost:3000             │
│  API       http://localhost:3001             │
│  Admin     http://localhost:3002             │
│  Ctrl+C to stop apps (Docker stays up)       │
└──────────────────────────────────────────────┘
`);
}

function startApps(stepLabel = "5️⃣") {
  printBanner();
  console.log(`${stepLabel}  Starting apps (turbo run dev)...\n`);

  const child = spawn("pnpm", ["exec", "turbo", "run", "dev"], {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
  });

  const shutdown = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  child.on("exit", (code, signal) => {
    if (signal) {
      process.exit(0);
    }
    process.exit(code ?? 1);
  });
}

function main() {
  console.log("\n🚀 Starting Travel Bug local stack...\n");

  if (appsOnly) {
    console.log("0️⃣  --apps-only: skipping infra bootstrap\n");
    startApps("1️⃣");
    return;
  }

  try {
    console.log("1️⃣  Ensuring .env...");
    ensureEnv();

    console.log("\n2️⃣  Ensuring Docker services...");
    ensureDocker();

    if (!noMigrate) {
      console.log("\n3️⃣  Applying database migrations...");
      run("pnpm db:migrate");
      console.log("✅ Migrations applied");
    } else {
      console.log("\n3️⃣  Skipping migrations (--no-migrate)");
    }

    if (!noSeed) {
      console.log("\n4️⃣  Seeding demo data (idempotent)...");
      run("pnpm db:seed");
      console.log("✅ Seed complete");
    } else {
      console.log("\n4️⃣  Skipping seed (--no-seed)");
    }

    startApps("5️⃣");
  } catch {
    console.error("\n❌ Failed to start local stack\n");
    process.exit(1);
  }
}

main();

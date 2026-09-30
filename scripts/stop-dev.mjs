#!/usr/bin/env node

/**
 * Tear down the local Working POC stack (counterpart to start-dev).
 *
 * Usage:
 *   pnpm stop:dev
 *   pnpm stop:dev -- --apps-only
 *   pnpm stop:dev -- --volumes
 *
 * Flags:
 *   --apps-only  Stop app processes on :3000/:3001/:3002 only; leave Docker running
 *   --volumes    Also remove Docker volumes (wipes Postgres/Redis data)
 */

import { execSync, spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const args = new Set(process.argv.slice(2).filter((a) => a !== '--'));
const appsOnly = args.has('--apps-only');
const withVolumes = args.has('--volumes');

const APP_PORTS = [3000, 3001, 3002];

function run(command, options = {}) {
  console.log(`   $ ${command}`);
  execSync(command, {
    stdio: 'inherit',
    cwd: rootDir,
    ...options,
  });
}

function runCapture(command) {
  const result = spawnSync(command, {
    shell: true,
    cwd: rootDir,
    encoding: 'utf8',
  });
  return {
    ok: result.status === 0,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
  };
}

function pidsOnPort(port) {
  const { stdout } = runCapture(`lsof -nP -tiTCP:${port} -sTCP:LISTEN 2>/dev/null`);
  if (!stdout) return [];
  return [...new Set(stdout.split(/\s+/).filter(Boolean))];
}

function killPids(pids, force = false) {
  if (pids.length === 0) return;
  const signal = force ? '-9' : '';
  const cmd = `kill ${signal} ${pids.join(' ')}`.replace(/\s+/g, ' ').trim();
  runCapture(cmd);
}

function stopAppProcesses() {
  const allPids = new Set();

  for (const port of APP_PORTS) {
    const pids = pidsOnPort(port);
    if (pids.length === 0) {
      console.log(`   :${port} — nothing listening`);
      continue;
    }
    console.log(`   :${port} — stopping PID(s) ${pids.join(', ')}`);
    for (const pid of pids) allPids.add(pid);
  }

  if (allPids.size === 0) {
    console.log('✅ No app listeners on :3000 / :3001 / :3002');
    return;
  }

  killPids([...allPids], false);

  // Brief wait, then force-kill leftovers
  spawnSync('sleep', ['1']);
  const leftovers = [];
  for (const port of APP_PORTS) {
    leftovers.push(...pidsOnPort(port));
  }
  if (leftovers.length > 0) {
    console.log(`   Force-killing stubborn PID(s): ${leftovers.join(', ')}`);
    killPids([...new Set(leftovers)], true);
  }

  console.log('✅ App processes stopped');
}

function stopDocker() {
  const dockerOk = runCapture('docker info >/dev/null 2>&1').ok;
  if (!dockerOk) {
    console.log('⚠️  Docker is not running — skipping compose down');
    return;
  }

  if (withVolumes) {
    console.log('   Stopping Compose and removing volumes (data wipe)...');
    run('docker compose down -v');
    console.log('✅ Docker services stopped; volumes removed');
  } else {
    console.log('   Stopping Compose (volumes kept)...');
    run('docker compose down');
    console.log('✅ Docker services stopped (data preserved)');
  }
}

function main() {
  console.log('\n🛑 Tearing down Travel Bug local stack...\n');

  try {
    console.log('1️⃣  Stopping apps (ports 3000 / 3001 / 3002)...');
    stopAppProcesses();

    if (appsOnly) {
      console.log('\n2️⃣  --apps-only: leaving Docker running');
      console.log('\n✅ Tear down complete (apps only)\n');
      return;
    }

    console.log('\n2️⃣  Stopping Docker Compose...');
    stopDocker();

    console.log('\n✅ Tear down complete\n');
  } catch (err) {
    console.error('\n❌ Tear down failed\n');
    if (err instanceof Error && err.message) {
      console.error(err.message);
    }
    process.exit(1);
  }
}

main();

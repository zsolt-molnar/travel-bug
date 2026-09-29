#!/usr/bin/env node

/**
 * Build the traveler web app (Next static export) and sync into Capacitor.
 *
 * Usage:
 *   pnpm build-mobile              # production (default)
 *   pnpm build-mobile -- staging
 *   pnpm build-mobile -- production
 */

import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

function main() {
  const mode = process.argv[2] || 'production';

  if (!['staging', 'production'].includes(mode)) {
    console.error(`❌ Error: Invalid mode "${mode}"`);
    console.error(`Usage: pnpm build-mobile [-- staging|production]`);
    console.error(`\nExamples:`);
    console.error(`  pnpm build-mobile              (defaults to production)`);
    console.error(`  pnpm build-mobile -- staging\n`);
    process.exit(1);
  }

  console.log(`\n🚀 Building mobile app in ${mode} mode...\n`);

  try {
    // Step 0: Timestamp-based build number (seconds since 2020-01-01 UTC)
    const epochStart = Math.floor(new Date('2020-01-01T00:00:00Z').getTime() / 1000);
    const now = Math.floor(Date.now() / 1000);
    const buildNumber = now - epochStart;
    console.log(`0️⃣  Generated build number: ${buildNumber} (seconds since 2020-01-01 UTC)`);

    const packageJsonPath = resolve(rootDir, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    packageJson.buildNumber = buildNumber;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');

    console.log('   Syncing to native projects...');
    execSync(`node ${resolve(__dirname, 'sync-version.mjs')}`, {
      stdio: 'inherit',
      cwd: rootDir,
    });

    // Step 1: Generate .env.production.local from mobile secrets
    console.log('\n1️⃣  Setting up environment variables...');
    execSync(`node ${resolve(__dirname, 'setup-mobile-env.mjs')} ${mode}`, {
      stdio: 'inherit',
      cwd: rootDir,
    });

    // Step 2: Validate env
    console.log('\n2️⃣  Checking environment variables...');
    execSync(`node ${resolve(__dirname, 'check-mobile-env.mjs')} ${mode}`, {
      stdio: 'inherit',
      cwd: rootDir,
    });

    // Step 3: Clean previous static export
    console.log('\n3️⃣  Cleaning out/ directory...');
    execSync('rm -rf out', { stdio: 'inherit', cwd: rootDir });

    // Step 4: Next.js static export (production env)
    console.log(`\n4️⃣  Building Next.js static export (${mode} secrets → .env.production.local)...`);
    execSync('pnpm exec next build', {
      stdio: 'inherit',
      cwd: rootDir,
      env: { ...process.env, NODE_ENV: 'production' },
    });

    // Step 5: Capacitor sync
    console.log('\n5️⃣  Syncing Capacitor...');
    execSync('npx cap sync', { stdio: 'inherit', cwd: rootDir });

    console.log(`\n✅ Mobile build complete (${mode} mode)\n`);
    console.log('Next steps:');
    console.log('  iOS:     Open ios/App/App.xcworkspace in Xcode');
    console.log('  Android: Open android/ in Android Studio');
    console.log('  Or:      pnpm cap:ios / pnpm cap:android\n');
  } catch {
    console.error(`\n❌ Build failed\n`);
    process.exit(1);
  }
}

main();

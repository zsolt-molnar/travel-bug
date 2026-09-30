#!/usr/bin/env node

/**
 * Bump version numbers in package.json
 *
 * Usage:
 *   npm run bump-version                 # Defaults to patch: 2.0.3 → 2.0.4
 *   npm run bump-version patch           # 2.0.3 → 2.0.4, buildNumber++
 *   npm run bump-version minor           # 2.0.3 → 2.1.0, buildNumber++
 *   npm run bump-version major           # 2.0.3 → 3.0.0, buildNumber++
 *   npm run bump-version build           # Only increment buildNumber
 *
 * After bumping, automatically syncs to iOS and Android.
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const bumpType = process.argv[2] || 'patch';

if (!['patch', 'minor', 'major', 'build'].includes(bumpType)) {
  console.error('❌ Error: Invalid bump type');
  console.error('Usage: npm run bump-version [patch|minor|major|build]');
  console.error('\nExamples:');
  console.error('  npm run bump-version         # Defaults to patch');
  console.error('  npm run bump-version patch   # 2.0.3 → 2.0.4');
  console.error('  npm run bump-version minor   # 2.0.3 → 2.1.0');
  console.error('  npm run bump-version major   # 2.0.3 → 3.0.0');
  console.error('  npm run bump-version build   # Only increment build number\n');
  process.exit(1);
}

// Read package.json
const packageJsonPath = join(rootDir, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

let { marketingVersion, buildNumber } = packageJson;

if (!marketingVersion || !buildNumber) {
  console.error(
    '❌ Error: marketingVersion and buildNumber must be defined in package.json',
  );
  process.exit(1);
}

// Parse version
const [major, minor, patch] = marketingVersion.split('.').map(Number);

// Bump version
let newVersion = marketingVersion;

if (bumpType === 'major') {
  newVersion = `${major + 1}.0.0`;
} else if (bumpType === 'minor') {
  newVersion = `${major}.${minor + 1}.0`;
} else if (bumpType === 'patch') {
  newVersion = `${major}.${minor}.${patch + 1}`;
}

// Always increment build number
const newBuildNumber = buildNumber + 1;

console.log(`📦 Bumping version:`);
console.log(
  `   ${marketingVersion} (${buildNumber}) → ${newVersion} (${newBuildNumber})`,
);

// Update package.json
packageJson.marketingVersion = newVersion;
packageJson.buildNumber = newBuildNumber;

writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
console.log(`✅ Updated package.json`);

// Sync to native projects
console.log('\n🔄 Syncing to native projects...\n');
execSync('node scripts/sync-version.mjs', { stdio: 'inherit', cwd: rootDir });

console.log(`\n✨ Version bump complete!`);
console.log(`\nNext steps:`);
console.log(`  1. Test the app`);
console.log(
  `  2. Commit: git add -A && git commit -m "Bump version to ${newVersion} (${newBuildNumber})"`,
);
console.log(`  3. Build mobile: pnpm build-mobile\n`);

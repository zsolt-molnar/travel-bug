#!/usr/bin/env node

/**
 * Syncs version numbers from package.json to iOS and Android native projects
 *
 * Usage:
 *   node scripts/sync-version.mjs
 *
 * This ensures build numbers stay in sync across platforms.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Read version from package.json
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
const { marketingVersion, buildNumber } = packageJson;

if (!marketingVersion || !buildNumber) {
  console.error(
    '❌ Error: marketingVersion and buildNumber must be defined in package.json',
  );
  process.exit(1);
}

console.log(`📦 Syncing versions: ${marketingVersion} (${buildNumber})`);

// ============================================
// Android: Update build.gradle
// ============================================
const androidBuildGradle = join(rootDir, 'android/app/build.gradle');
let androidContent = readFileSync(androidBuildGradle, 'utf8');

// Update versionCode
androidContent = androidContent.replace(
  /versionCode\s+\d+/,
  `versionCode ${buildNumber}`,
);

// Update versionName
androidContent = androidContent.replace(
  /versionName\s+"[^"]+"/,
  `versionName "${marketingVersion}"`,
);

writeFileSync(androidBuildGradle, androidContent, 'utf8');
console.log(
  `✅ Android synced: versionName="${marketingVersion}" versionCode=${buildNumber}`,
);

// ============================================
// iOS: Update project.pbxproj
// ============================================
const iosPbxproj = join(rootDir, 'ios/App/App.xcodeproj/project.pbxproj');
let iosContent = readFileSync(iosPbxproj, 'utf8');

// Update CURRENT_PROJECT_VERSION (build number)
iosContent = iosContent.replace(
  /CURRENT_PROJECT_VERSION = [\d.]+;/g,
  `CURRENT_PROJECT_VERSION = ${buildNumber};`,
);

// Update MARKETING_VERSION
iosContent = iosContent.replace(
  /MARKETING_VERSION = [^;]+;/g,
  `MARKETING_VERSION = ${marketingVersion};`,
);

writeFileSync(iosPbxproj, iosContent, 'utf8');
console.log(
  `✅ iOS synced: MARKETING_VERSION=${marketingVersion} CURRENT_PROJECT_VERSION=${buildNumber}`,
);

console.log('✨ Version sync complete!');

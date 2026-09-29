#!/usr/bin/env node

import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

function parseEnvFiles() {
  // next build uses production env chain
  const files = [
    resolve(rootDir, '.env'),
    resolve(rootDir, '.env.local'),
    resolve(rootDir, '.env.production'),
    resolve(rootDir, '.env.production.local'),
  ];

  const vars = {};

  for (const file of files) {
    if (!existsSync(file)) continue;

    const content = readFileSync(file, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
      if (match) {
        vars[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
    }
  }

  return vars;
}

function main() {
  const mode = process.argv[2];

  if (!mode || !['staging', 'production'].includes(mode)) {
    console.error(`❌ Error: Invalid mode "${mode}"`);
    console.error(`Usage: node check-mobile-env.mjs <staging|production>\n`);
    process.exit(1);
  }

  const envLocalFile = resolve(rootDir, '.env.production.local');
  const secretsFile = `.env.mobile-secrets.${mode}.local`;

  if (!existsSync(envLocalFile)) {
    console.error(`❌ Error: ${envLocalFile} not found\n`);
    console.error(`Mobile builds require local secrets to be configured.`);
    console.error(`\nSetup instructions:`);
    console.error(`  1. cp .env.mobile-secrets.example ${secretsFile}`);
    console.error(`  2. Fill in the ${mode} values`);
    console.error(`  3. pnpm setup-mobile-env -- ${mode}\n`);
    process.exit(1);
  }

  const vars = parseEnvFiles();
  const placeholderPattern = /^###.*###$/;
  const requiredKeys = ['NEXT_PUBLIC_API_URL'];

  const missingKeys = requiredKeys.filter((key) => !vars[key]?.trim());

  if (missingKeys.length > 0) {
    console.error(`❌ Error: Required values are missing for mobile ${mode} build:`);
    missingKeys.forEach((key) => console.error(`   - ${key}`));
    process.exit(1);
  }

  const stillPlaceholders = requiredKeys.filter((key) => {
    const value = vars[key];
    return value && placeholderPattern.test(value);
  });

  if (stillPlaceholders.length > 0) {
    console.error(`❌ Error: Some required secrets are still placeholders:`);
    stillPlaceholders.forEach((key) => console.error(`   - ${key} = ${vars[key]}`));
    console.error(`\nRun: pnpm setup-mobile-env -- ${mode}\n`);
    process.exit(1);
  }

  if (vars.NEXT_PUBLIC_API_URL?.includes('localhost')) {
    console.warn(
      `⚠️  Warning: NEXT_PUBLIC_API_URL points at localhost — fine for simulator/dev builds, not for store releases.`,
    );
  }

  console.log(`✅ Environment check passed for ${mode} mode`);
}

main();

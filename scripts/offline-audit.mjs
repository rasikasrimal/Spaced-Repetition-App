#!/usr/bin/env node
import { readdir, stat, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const IGNORE_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  '.next',
  'out',
  'dist',
  'target',
  '.turbo',
]);

const TEXT_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.htm',
  '.js',
  '.jsx',
  '.json',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.rs',
  '.toml',
  '.lock',
  '.md',
  '.yml',
  '.yaml',
  '.txt',
  '.conf',
  '.config',
  '.ini',
]);

const FILE_IGNORE_PATTERNS = [
  /\/\.DS_Store$/,
  /\/package-lock\.json$/,
  /\/Cargo\.lock$/,
  /\/pnpm-lock\.yaml$/,
];

const URL_PATTERN = /(https?:\/\/[^\s"'`<>]+)/gi;

const ALLOWLIST = [
  /^https?:\/\/localhost(?::\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i,
  /^https?:\/\/www\.w3\.org\/2000\/svg$/i,
  /^https?:\/\/www\.w3\.org\/1999\/xlink$/i,
  /^https?:\/\/nextjs\.org\//i,
  /^https?:\/\/doc\.rust-lang\.org\//i,
];

async function main() {
  const files = await collectFiles(ROOT);
  const violations = [];

  for (const file of files) {
    const matches = await findUrls(file);
    if (!matches.length) continue;

    const disallowed = matches.filter((match) => !ALLOWLIST.some((allowed) => allowed.test(match)));
    if (disallowed.length) {
      violations.push({ file, urls: disallowed });
    }
  }

  if (violations.length) {
    console.error('Offline audit failed. Found disallowed URLs:');
    for (const violation of violations) {
      console.error(`\n${path.relative(ROOT, violation.file)}`);
      for (const url of violation.urls) {
        console.error(`  -> ${url}`);
      }
    }
    process.exit(1);
  }

  console.log('Offline audit passed. No external URLs detected.');
}

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (IGNORE_DIRECTORIES.has(entry.name)) {
      continue;
    }
    const entryPath = path.join(dir, entry.name);
    if (FILE_IGNORE_PATTERNS.some((pattern) => pattern.test(entryPath))) {
      continue;
    }

    if (entry.isDirectory()) {
      const nested = await collectFiles(entryPath);
      files.push(...nested);
    } else if (shouldInspectFile(entryPath)) {
      files.push(entryPath);
    }
  }

  return files;
}

function shouldInspectFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) {
    return true;
  }
  // Inspect extensionless files under src-tauri or scripts directories
  if (!ext) {
    return filePath.includes('src-tauri') || filePath.includes('scripts');
  }
  return false;
}

async function findUrls(filePath) {
  try {
    const info = await stat(filePath);
    if (info.size > 1024 * 1024) {
      return [];
    }
    const contents = await readFile(filePath, 'utf8');
    const matches = contents.match(URL_PATTERN);
    return matches ? matches.map((match) => match.trim()) : [];
  } catch (error) {
    // Binary or unreadable file, ignore quietly
    return [];
  }
}

main().catch((error) => {
  console.error('Offline audit encountered an error:', error);
  process.exit(1);
});

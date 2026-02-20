
import fs from 'fs';
import path from 'path';

console.log('Running Middleware Matcher Verification...');

const middlewarePath = path.join(process.cwd(), 'src/middleware.ts');
const content = fs.readFileSync(middlewarePath, 'utf-8');

// Extract matcher string
// Improved regex to handle comments and newlines inside the array
// Looking for: matcher: [ ... 'pattern' ... ]
const matcherRegex = /matcher:\s*\[[\s\S]*?['"`]((?:\/|\().*?)['"`]/;
const match = content.match(matcherRegex);

if (!match) {
  console.error('❌ Could not find matcher in src/middleware.ts');
  console.log('Content snippet:', content.slice(content.indexOf('export const config')));
  process.exit(1);
}

const matcherString = match[1];
console.log(`Found matcher: ${matcherString}`);

// The matcher string is usually a regex-like string used by path-to-regexp.
// It is explicitly: /((?!api|_next/static|_next/image|favicon.ico).*)
// This is a regex string. Next.js uses path-to-regexp which supports this.
// To test it in JS, we convert it to RegExp.
// We assume it matches the whole path.

let regex: RegExp;
try {
  // If the string starts with /, it's treated as part of the path unless it's a regex pattern.
  // Next.js documentation says:
  // "To match a path with a negative lookahead, you can use the syntax: /((?!api|_next/static|_next/image|favicon.ico).*)"
  // This syntax is directly compatible with JS RegExp if we wrap it.

  // We need to ensure we don't double escape or mess up.
  // The string captured is exactly: /((?!api|_next/static|_next/image|favicon.ico).*)
  // We want to match: ^/((?!api|_next/static|_next/image|favicon.ico).*)$
  regex = new RegExp(`^${matcherString}$`);
} catch (e) {
  console.error('❌ Failed to create RegExp from matcher string:', e);
  process.exit(1);
}

const shouldMatch = [
  '/searcher/dashboard',
  '/login',
  '/onboarding',
  '/investor/deals',
  '/about',
  // '/public/logo.png' - would match if it existed, as it's not excluded
];

const shouldNotMatch = [
  '/api/auth/callback',
  '/_next/static/chunks/main.js',
  '/_next/image?url=%2Fme.png&w=64&q=75',
  '/favicon.ico',
];

let failures = 0;

shouldMatch.forEach(path => {
  if (!regex.test(path)) {
    console.error(`❌ Failed to match protected route: ${path}`);
    failures++;
  }
});

shouldNotMatch.forEach(path => {
  if (regex.test(path)) {
    console.error(`❌ Incorrectly matched excluded route: ${path}`);
    failures++;
  }
});

if (failures > 0) {
  console.error(`\n${failures} matcher tests failed.`);
  process.exit(1);
}

console.log(`\nAll matcher tests passed! Regex: ${regex}`);

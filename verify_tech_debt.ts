
import fs from 'fs';
import path from 'path';

const filesToScan = [
  'src/shared/components/providers/dummy-auth-provider.tsx',
  'src/shared/lib/api.ts',
  'src/app/(auth)/layout.tsx',
  'src/app/(searcher)/layout.tsx',
  'src/app/(investor)/layout.tsx',
];

const patterns = [
  {
    regex: /NEXT_PUBLIC_USE_MOCKS/g,
    description: 'Usage of NEXT_PUBLIC_USE_MOCKS',
    files: ['src/shared/components/providers/dummy-auth-provider.tsx', 'src/shared/lib/api.ts'],
  },
  {
    regex: /TODO/g,
    description: 'TODO comments',
    files: filesToScan,
  },
  {
    regex: /as unknown as Response/g,
    description: 'Hacky implementation: as unknown as Response',
    files: ['src/shared/lib/api.ts'],
  },
  {
    regex: /bg-white/g,
    description: 'Layout consistency: bg-white (Searcher sidebar)',
    files: ['src/app/(searcher)/layout.tsx'],
  },
  {
    regex: /bg-slate-900/g,
    description: 'Layout consistency: bg-slate-900 (Investor sidebar)',
    files: ['src/app/(investor)/layout.tsx'],
  },
];

console.log('--- Tech Debt Verification Report ---');

let hasIssues = false;

filesToScan.forEach((filePath) => {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf-8');
    console.log(`\nScanning: ${filePath}`);

    patterns.forEach((pattern) => {
      if (pattern.files.includes(filePath)) {
        const matches = content.match(pattern.regex);
        if (matches) {
          console.log(`  [FOUND] ${pattern.description}: ${matches.length} occurrences`);
          hasIssues = true;
        } else {
             // For layout consistency checks, we expect to find them. If not found, it's an issue.
             if (pattern.description.startsWith('Layout consistency')) {
                 console.log(`  [MISSING] ${pattern.description}`);
                 hasIssues = true;
             }
        }
      }
    });
  } else {
    console.error(`  [ERROR] File not found: ${filePath}`);
    hasIssues = true;
  }
});

console.log('\n--- End of Report ---');

if (hasIssues) {
    // We don't exit with error code because finding tech debt is expected,
    // but missing layout consistency is a potential issue.
    // However, for this task, the goal is to report, not fail the build.
    process.exit(0);
}

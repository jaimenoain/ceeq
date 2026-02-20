const fs = require('fs');
const path = require('path');

const checks = [
  {
    path: 'src/app/(auth)/layout.tsx',
    requiredStrings: ['Logo'],
    description: 'Auth Layout',
  },
  {
    path: 'src/app/(searcher)/layout.tsx',
    requiredStrings: [
      'bg-slate-50',
      'w-64',
      'border-r',
      'bg-white',
      'overflow-hidden',
      '/searcher/dashboard',
      '/searcher/universe',
      '/searcher/pipeline',
      'Logout'
    ],
    description: 'Searcher Layout',
  },
  {
    path: 'src/app/(investor)/layout.tsx',
    requiredStrings: [
      'bg-slate-900',
      'text-white',
      'w-64',
      '/investor/dashboard',
      '/investor/deals',
      'Logout'
    ],
    description: 'Investor Layout',
  },
];

let hasError = false;

console.log('Verifying layouts...');

checks.forEach((check) => {
  const fullPath = path.resolve(process.cwd(), check.path);

  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Missing file: ${check.path}`);
    hasError = true;
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const missingStrings = check.requiredStrings.filter((str) => !content.includes(str));

  if (missingStrings.length > 0) {
    console.error(`❌ ${check.description} missing required content: ${missingStrings.join(', ')}`);
    hasError = true;
  } else {
    console.log(`✅ ${check.description} passed.`);
  }
});

if (hasError) {
  console.error('\n❌ Layout verification failed.');
  process.exit(1);
} else {
  console.log('\n✅ Layout verification passed.');
}

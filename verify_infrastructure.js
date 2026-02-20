const fs = require('fs');

const REQUIRED_FILES = [
  '.env.local',
  'src/shared/lib/supabase/server.ts',
  'src/shared/lib/supabase/browser.ts',
  'src/shared/components/providers/query-provider.tsx',
  'src/shared/components/providers/theme-provider.tsx',
];

const REQUIRED_DEPENDENCIES = [
  '@supabase/supabase-js',
  '@supabase/ssr',
  '@tanstack/react-query',
  'next-themes',
];

let hasError = false;

console.log('Verifying infrastructure...');

// 1. Check dependencies
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

  REQUIRED_DEPENDENCIES.forEach(dep => {
    if (!dependencies[dep]) {
      console.error(`❌ Missing dependency: ${dep}`);
      hasError = true;
    } else {
      console.log(`✅ Dependency found: ${dep}`);
    }
  });
} catch (error) {
  console.error('❌ Failed to read package.json:', error.message);
  hasError = true;
}

// 2. Check files
REQUIRED_FILES.forEach(file => {
  if (!fs.existsSync(file)) {
    console.error(`❌ Missing file: ${file}`);
    hasError = true;
  } else {
    console.log(`✅ File found: ${file}`);
  }
});

if (hasError) {
  console.error('\n❌ Infrastructure verification failed.');
  process.exit(1);
} else {
  console.log('\n✅ Infrastructure verification passed.');
}

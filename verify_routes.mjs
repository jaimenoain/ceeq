import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const requiredFiles = [
  'src/app/page.tsx',
  'src/app/(auth)/login/page.tsx',
  'src/app/(auth)/onboarding/page.tsx',
  'src/app/(searcher)/searcher/dashboard/page.tsx',
  'src/app/(searcher)/searcher/universe/page.tsx',
  'src/app/(searcher)/searcher/pipeline/page.tsx',
  'src/app/(investor)/investor/dashboard/page.tsx',
  'src/app/(investor)/investor/deals/page.tsx',
];

let hasError = false;

console.log('Verifying required routes...\n');

requiredFiles.forEach((file) => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ Found: ${file}`);
  } else {
    console.error(`❌ Missing: ${file}`);
    hasError = true;
  }
});

if (hasError) {
  console.log('\nVerification failed. Some routes are missing.');
  process.exit(1);
} else {
  console.log('\nAll required routes exist. Verification successful!');
  process.exit(0);
}

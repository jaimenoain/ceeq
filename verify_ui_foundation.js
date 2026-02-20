const fs = require('fs');
const path = require('path');

const REQUIRED_FILES = [
  'tailwind.config.ts',
  'src/shared/lib/utils.ts',
  'src/shared/components/ui/button.tsx',
  'src/shared/components/ui/input.tsx',
  'src/shared/components/ui/card.tsx',
  'src/shared/components/ui/sheet.tsx',
  'src/shared/components/ui/table.tsx',
  'src/shared/components/ui/dialog.tsx',
];

const REQUIRED_DIRS = [
  'src/shared/components/ui/',
];

let hasError = false;

console.log('Verifying UI Foundation...');

REQUIRED_DIRS.forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.error(`❌ Directory missing: ${dir}`);
    hasError = true;
  } else {
    console.log(`✅ Directory exists: ${dir}`);
  }
});

REQUIRED_FILES.forEach(file => {
  if (!fs.existsSync(file)) {
    console.error(`❌ File missing: ${file}`);
    hasError = true;
  } else {
    console.log(`✅ File exists: ${file}`);
  }
});

if (hasError) {
  console.error('❌ UI Foundation verification failed.');
  process.exit(1);
} else {
  console.log('✅ UI Foundation verification passed.');
  process.exit(0);
}

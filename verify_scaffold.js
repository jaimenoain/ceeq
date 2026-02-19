const fs = require('fs');
const path = require('path');

const requiredPaths = [
  'src/app/',
  'tailwind.config.ts',
  'package.json',
  'ARCHITECTURE.md',
  'docs/DOMAIN_MODEL.md',
  'docs/UX_SPEC.md',
  '.ai-status.md',
];

let missing = false;

console.log('Verifying scaffold...');

requiredPaths.forEach((p) => {
  const fullPath = path.join(__dirname, p);

  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    if (p.endsWith('/')) {
      if (stats.isDirectory()) {
        console.log(`✅ Directory ${p} exists`);
      } else {
        console.log(`❌ ${p} exists but is not a directory`);
        missing = true;
      }
    } else {
      if (stats.isFile()) {
        console.log(`✅ File ${p} exists`);
      } else {
        console.log(`❌ ${p} exists but is not a file`);
        missing = true;
      }
    }
  } else {
    console.log(`❌ ${p} is missing`);
    missing = true;
  }
});

if (missing) {
  console.log('Verification failed.');
  process.exit(1);
} else {
  console.log('Verification passed.');
  process.exit(0);
}

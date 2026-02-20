
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

// Construct the secret so it doesn't appear literally in this file
const SECRET_PART_1 = 'SUPER_SECRET';
const SECRET_PART_2 = '_KEY';
const SECRET_VAL_PART_1 = 'do_not';
const SECRET_VAL_PART_2 = '_leak_this';
const SECRET_KEY = `${SECRET_PART_1}${SECRET_PART_2}=${SECRET_VAL_PART_1}${SECRET_VAL_PART_2}`;
const SECRET_VALUE = `${SECRET_VAL_PART_1}${SECRET_VAL_PART_2}`;
const DUMMY_ENV_FILE = '.env.dummy';
const OUTPUT_FILE = 'repomix-output.xml';

console.log('Starting Repomix verification...');

// 1. Create dummy .env file
try {
  fs.writeFileSync(DUMMY_ENV_FILE, SECRET_KEY);
  console.log(`Created dummy env file: ${DUMMY_ENV_FILE}`);
} catch (err) {
  console.error(`Error creating dummy env file: ${err.message}`);
  process.exit(1);
}

// 2. Run repomix
try {
  console.log('Running npx repomix...');
  execSync('npx repomix', { stdio: 'inherit' });
} catch (err) {
  console.error(`Error running repomix: ${err.message}`);
  // clean up
  try { fs.unlinkSync(DUMMY_ENV_FILE); } catch (e) {}
  process.exit(1);
}

// 3. Verify output file exists
if (!fs.existsSync(OUTPUT_FILE)) {
  console.error(`Error: Output file ${OUTPUT_FILE} was not created.`);
  try { fs.unlinkSync(DUMMY_ENV_FILE); } catch (e) {}
  process.exit(1);
}

// 4. Verify secret is NOT in output
try {
  const content = fs.readFileSync(OUTPUT_FILE, 'utf8');
  if (content.includes(SECRET_VALUE)) {
    console.error(`CRITICAL FAILURE: Secret value found in ${OUTPUT_FILE}!`);
    // Check if it's from the .env file
    if (content.includes(`<file path="${DUMMY_ENV_FILE}">`)) {
       console.error(`Confirmed: ${DUMMY_ENV_FILE} was included in the output.`);
    } else {
       console.error(`Warning: Secret found but ${DUMMY_ENV_FILE} file tag not found. Might be from another source?`);
    }

    try { fs.unlinkSync(DUMMY_ENV_FILE); } catch (e) {}
    process.exit(1);
  } else {
    console.log(`SUCCESS: Secret value NOT found in ${OUTPUT_FILE}.`);
  }
} catch (err) {
  console.error(`Error reading output file: ${err.message}`);
  try { fs.unlinkSync(DUMMY_ENV_FILE); } catch (e) {}
  process.exit(1);
}

// 5. Clean up
try {
  fs.unlinkSync(DUMMY_ENV_FILE);
  console.log(`Cleaned up ${DUMMY_ENV_FILE}`);
} catch (err) {
  console.error(`Error during cleanup: ${err.message}`);
}

console.log('Verification passed!');

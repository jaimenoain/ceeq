import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function verify() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Navigating to /searcher/universe...');
    await page.goto('http://localhost:3000/searcher/universe');

    // Wait for the button
    console.log('Waiting for Import CSV button...');
    await page.waitForSelector('button:has-text("Import CSV")');
    await page.click('button:has-text("Import CSV")');

    // Wait for modal
    console.log('Waiting for modal...');
    await page.waitForSelector('text=Import Sourcing Targets');

    // Create a dummy CSV file
    const csvContent = 'Name,Domain,Industry\nAcme Corp,acme.com,Tech\nGlobex,globex.com,Manufacturing';
    const csvPath = path.resolve('verification/dummy.csv');
    fs.writeFileSync(csvPath, csvContent);

    // Upload file
    console.log('Uploading CSV...');
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
        await fileInput.setInputFiles(csvPath);
    } else {
        throw new Error('File input not found');
    }

    // Wait for mapping options
    console.log('Waiting for mapping options...');
    const modal = page.locator('div[role="dialog"]');
    await modal.locator('text=Map Columns').waitFor();

    // Find selects INSIDE the modal
    const triggers = modal.locator('button[role="combobox"]');
    const count = await triggers.count();
    console.log(`Found ${count} selects in modal`);

    if (count < 2) throw new Error('Not enough select inputs found in modal');

    // 1. Map Name (1st select)
    console.log('Mapping Name...');
    await triggers.nth(0).click();
    // Wait for options
    await page.waitForSelector('div[role="option"]', { state: 'visible' });
    // Click "Name" option
    await page.click('div[role="option"] >> text=Name');

    // 2. Map Domain (2nd select)
    console.log('Mapping Domain...');
    await triggers.nth(1).click();
    await page.waitForSelector('div[role="option"]', { state: 'visible' });
    await page.click('div[role="option"] >> text=Domain');

    // 3. Map Industry (3rd select)
    console.log('Mapping Industry...');
    if (count > 2) {
        await triggers.nth(2).click();
        await page.waitForSelector('div[role="option"]', { state: 'visible' });
        await page.click('div[role="option"] >> text=Industry');
    }

    // Submit
    console.log('Submitting...');
    await page.click('button:has-text("Import Targets")');

    // Wait for Toast
    console.log('Waiting for success toast...');
    // We look for part of the success message
    await page.waitForSelector('text=Import Successful', { timeout: 10000 });

    // Take screenshot
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'verification/csv_upload_success.png' });

    console.log('Verification successful!');

  } catch (error) {
    console.error('Verification failed:', error);
    await page.screenshot({ path: 'verification/csv_upload_failure.png' });
    process.exit(1);
  } finally {
    await browser.close();
    // Clean up dummy file
    if (fs.existsSync('verification/dummy.csv')) {
        fs.unlinkSync('verification/dummy.csv');
    }
  }
}

verify();

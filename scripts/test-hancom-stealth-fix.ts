#!/usr/bin/env tsx

/**
 * Test Hancom Docs Stealth Browser Fix
 *
 * Verifies that the headless browser can successfully login to Hancom Docs
 * after adding stealth arguments to bypass detection.
 */

import { createHancomDocsBrowser } from '../lib/scraping/utils/hancom-docs-converter';

async function main() {
  console.log('🧪 Testing Hancom Docs Stealth Browser Fix...\n');

  try {
    // Attempt to create authenticated browser session
    const browser = await createHancomDocsBrowser();

    if (browser) {
      console.log('✅ SUCCESS: Shared browser created and authenticated');
      console.log('   Stealth arguments successfully bypassed Hancom Docs detection\n');

      // Clean up
      await browser.close();
      console.log('✓ Browser cleaned up');
      process.exit(0);
    } else {
      console.error('❌ FAILURE: Browser creation returned null');
      console.error('   Headless detection may still be blocking login\n');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
}

main();

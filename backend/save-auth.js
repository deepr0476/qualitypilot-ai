/**
 * save-auth.js - Standalone Playwright script for Salesforce Authentication
 * 
 * Opens https://salesforce.com in headed Chromium (channel: 'chrome' or default chromium).
 * Waits until the user logs in and the browser URL reaches .lightning.force.com or /lightning/,
 * then waits 3 extra seconds before saving backend/auth.json so all Lightning session cookies are captured.
 */

require('dotenv').config();
const { chromium } = require('playwright');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const AUTH_PATH = path.join(__dirname, 'auth.json');
const LOGIN_URL = process.env.SF_LOGIN_URL || 'https://salesforce.com';

function promptUser(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    });
  });
}

async function saveAuth() {
  console.log('\n======================================================');
  console.log('🛡️  QualityPilot AI - Salesforce Session Auth Saver');
  console.log('======================================================\n');
  console.log(`🌐 Launching headed browser...`);
  console.log(`🔗 Target Login URL: ${LOGIN_URL}\n`);

  let browser;
  try {
    try {
      console.log('🚀 Attempting to launch with channel: "chrome"...');
      browser = await chromium.launch({
        headless: false,
        channel: 'chrome',
        args: ['--start-maximized', '--disable-blink-features=AutomationControlled'],
      });
      console.log('✅ Google Chrome launched successfully.');
    } catch (chromeErr) {
      console.log(`⚠️ Chrome channel unavailable (${chromeErr.message.slice(0, 60)}). Launching default Chromium...`);
      browser = await chromium.launch({
        headless: false,
        args: ['--start-maximized', '--disable-blink-features=AutomationControlled'],
      });
      console.log('✅ Default Chromium launched.');
    }

    const context = await browser.newContext({
      viewport: null, // use full window
    });

    const page = await context.newPage();

    console.log(`Navigating to ${LOGIN_URL}...`);
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Pre-fill username if available in .env
    if (process.env.SF_USERNAME && process.env.SF_USERNAME !== 'your_salesforce_username@example.com') {
      try {
        const usernameSelector = '#username';
        if (await page.isVisible(usernameSelector)) {
          console.log(`Pre-filling username from .env: ${process.env.SF_USERNAME}`);
          await page.fill(usernameSelector, process.env.SF_USERNAME);
        }
      } catch (_) {
        // ignore pre-fill error
      }
    }

    console.log('\n------------------------------------------------------');
    console.log('👉 ACTION REQUIRED:');
    console.log('1. In the opened browser window, log into your Salesforce account.');
    console.log('2. Complete any MFA / OTP verification (Authenticator App / SMS).');
    console.log('3. Script will automatically detect when the URL reaches:');
    console.log('   ".lightning.force.com" or "/lightning/"');
    console.log('------------------------------------------------------\n');
    console.log('⏳ Waiting for browser URL to reach .lightning.force.com or /lightning/ ...\n');

    const isLightningUrl = (urlStr) => {
      try {
        const u = new URL(urlStr);
        return u.hostname.includes('.lightning.force.com') || u.pathname.includes('/lightning/') || u.href.includes('/lightning/');
      } catch (_) {
        return urlStr.includes('.lightning.force.com') || urlStr.includes('/lightning/');
      }
    };

    let urlWatchInterval = null;

    const autoWaitPromise = new Promise((resolve) => {
      if (isLightningUrl(page.url())) {
        return resolve(page.url());
      }

      page.on('framenavigated', () => {
        const currentUrl = page.url();
        if (isLightningUrl(currentUrl)) {
          resolve(currentUrl);
        }
      });

      urlWatchInterval = setInterval(() => {
        const currentUrl = page.url();
        if (isLightningUrl(currentUrl)) {
          if (urlWatchInterval) clearInterval(urlWatchInterval);
          resolve(currentUrl);
        }
      }, 500);
    });

    const manualFallbackPromise = promptUser('👉 (Or press [ENTER] here once you see your Salesforce Lightning page): ');

    await Promise.race([autoWaitPromise, manualFallbackPromise]);
    if (urlWatchInterval) clearInterval(urlWatchInterval);

    console.log(`\n🎯 Salesforce Lightning URL detected!`);
    console.log(`📍 Current URL: ${page.url()}`);
    console.log(`⏳ Waiting 3 extra seconds so all Lightning session cookies, auth tokens, and local storage settle...`);
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle').catch(() => {});

    console.log(`\n💾 Capturing authenticated session cookies and storage state to: ${AUTH_PATH}...`);
    await context.storageState({ path: AUTH_PATH });

    if (fs.existsSync(AUTH_PATH)) {
      const stats = fs.statSync(AUTH_PATH);
      console.log(`\n✅ Session successfully saved!`);
      console.log(`📁 File: ${AUTH_PATH} (${stats.size} bytes)`);
      console.log(`💡 Quality X will now automatically use this authenticated session for all Salesforce tests.\n`);
    } else {
      console.error(`❌ Error: auth.json was not created.`);
    }

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error during auth capture:', err.message);
    if (browser) {
      await browser.close().catch(() => {});
    }
    process.exit(1);
  }
}

saveAuth();

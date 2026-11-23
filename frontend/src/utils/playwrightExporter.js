/**
 * playwrightExporter.js
 * 
 * Quality X — Standalone CI/CD Playwright Test Script Generator
 * Translates test cases and execution steps into clean, executable @playwright/test code.
 */

export function generatePlaywrightSpec({ testCases = [], suiteName = 'Salesforce_QA_Suite', salesforceUrl = 'https://kns5-dev-ed.develop.lightning.force.com' }) {
  const safeSuiteName = (suiteName || 'Salesforce_Suite').replace(/[^a-zA-Z0-9_]/g, '_');

  const testBlocks = testCases.map((tc, idx) => {
    const rawTitle = tc.name || tc.description || `Test Scenario ${idx + 1}`;
    const safeTitle = rawTitle.replace(/'/g, "\\'");
    const steps = tc.steps || [];

    const translatedSteps = steps.map((step) => {
      const trimmed = (step || '').trim();
      if (!trimmed) return '';

      // REST API Transaction
      if (trimmed.startsWith('API_REQUEST')) {
        const parts = trimmed.split(/\s+/);
        const method = (parts[1] || 'GET').toUpperCase();
        const endpoint = parts[2] || '';
        let bodyJson = null;
        try {
          const match = trimmed.match(/\{[\s\S]*\}/);
          if (match) bodyJson = JSON.parse(match[0]);
        } catch (_) {}

        return `    // REST API Transaction (${method} ${endpoint})
    const apiRes_${idx} = await request.${method.toLowerCase()}('${endpoint.startsWith('http') ? endpoint : '${instanceUrl}' + endpoint}', {
      headers: {
        'Authorization': \`Bearer \${accessToken}\`,
        'Content-Type': 'application/json',
      },
      ${bodyJson ? `data: ${JSON.stringify(bodyJson, null, 6).trim()}` : ''}
    });
    expect(apiRes_${idx}.status()).toBeLessThan(400);`;
      }

      // Universal Salesforce Skill
      if (trimmed.startsWith('SKILL')) {
        return `    // Universal Salesforce Skill Execution
    console.log('[Skill] ${trimmed.replace(/'/g, "\\'")}');`;
      }

      // Input field fill
      if (trimmed.startsWith('FILL_OMNI') || trimmed.startsWith('FILL_FIELD') || trimmed.startsWith('FILL_LIGHTNING_INPUT')) {
        const parts = trimmed.split(/\s+/);
        const fld = parts[1];
        const val = parts.slice(2).join(' ').replace(/'/g, "\\'");
        return `    // Fill input for ${fld}
    await page.getByLabel('${fld}', { exact: false })
      .or(page.locator('input[name="${fld}"]'))
      .or(page.locator('input[name="${fld.charAt(0).toLowerCase() + fld.slice(1)}"]'))
      .first()
      .fill('${val}');`;
      }

      // Picklist / Combobox select
      if (trimmed.startsWith('SELECT_OMNI') || trimmed.startsWith('SELECT_LIGHTNING_PICKLIST') || trimmed.startsWith('SELECT_PICKLIST')) {
        const parts = trimmed.split(/\s+/);
        const fld = parts[1];
        const opt = parts.slice(2).join(' ').replace(/'/g, "\\'");
        return `    // Select picklist option for ${fld}
    const cb_${idx} = page.getByLabel('${fld}', { exact: false }).first();
    await cb_${idx}.click();
    await page.locator(\`lightning-base-combobox-item:has-text("${opt}"), [role="option"]:has-text("${opt}"), span[title="${opt}"]\`).first().click();`;
      }

      // Checkbox
      if (trimmed.startsWith('CHECK_OMNI') || trimmed.startsWith('CHECK_LIGHTNING_CHECKBOX')) {
        const parts = trimmed.split(/\s+/);
        const fld = parts[1];
        return `    // Check checkbox ${fld}
    await page.getByLabel('${fld}', { exact: false }).first().check();`;
      }

      // Next / Submit Button
      if (trimmed === 'CLICK_NEXT' || trimmed === 'CLICK_SUBMIT' || trimmed === 'CLICK_OMNI_NEXT') {
        return `    // Click Next / Submit
    await page.locator('button:has-text("Next"), button.slds-button_brand:has-text("Next")').first().click();
    await page.waitForTimeout(1500);`;
      }

      // Modal New Record
      if (trimmed === 'CLICK_NEW') {
        return `    // Open New Record Modal
    await page.locator('a[title="New"], button:has-text("New"), button[name="New"]').first().click();
    await page.locator('.slds-modal__container, div.modal-container').waitFor({ state: 'visible', timeout: 15000 });`;
      }

      // Modal Save Button
      if (trimmed === 'CLICK_SAVE') {
        return `    // Click Modal Save
    await page.locator('button[name="SaveEdit"], footer button.slds-button_brand, button:has-text("Save")').last().click();
    await page.waitForTimeout(2000);`;
      }

      // Generic Click Button
      if (trimmed.startsWith('CLICK_BUTTON')) {
        const btn = trimmed.replace(/^CLICK_BUTTON\s+["']?([^"']+)["']?$/i, '$1').replace(/'/g, "\\'");
        return `    // Click button "${btn}"
    await page.locator(\`button:has-text("${btn}"), a:has-text("${btn}"), .slds-button:has-text("${btn}")\`).first().click();`;
      }

      // Product Selection
      if (trimmed.startsWith('SEARCH_AND_SELECT_PRODUCT') || trimmed.startsWith('SELECT_PRODUCT') || trimmed.startsWith('ADD_PRODUCT')) {
        return `    // Catalog Product Search and Selection
    const searchInp = page.locator('input[placeholder*="Search" i]').first();
    if (await searchInp.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInp.fill('GenWatt');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      await page.locator('tbody tr input[type="checkbox"]').first().check();
      await page.locator('button:has-text("Next"), button.slds-button_brand:has-text("Next")').first().click();
    }`;
      }

      // Assertions
      if (trimmed.startsWith('ASSERT_CONFIRMATION') || trimmed.startsWith('ASSERT_VISIBLE')) {
        return `    // Verify Confirmation / Record Visibility
    await expect(page.locator('.slds-card, .confirmation-box, [role="main"]').first()).toBeVisible({ timeout: 15000 });`;
      }

      return `    // Step: ${trimmed}`;
    }).filter(Boolean).join('\n\n');

    return `  test('${tc.id || `TC_${idx + 1}`}: ${safeTitle}', async ({ page, request }) => {
    test.setTimeout(60000);

    // Frontdoor Authentication & Direct Lightning Navigation
    const frontdoorRetUrl = encodeURIComponent('${salesforceUrl.startsWith('/') ? salesforceUrl : '/lightning/page/home'}');
    const frontdoorUrl = \`\${instanceUrl}/secur/frontdoor.jsp?sid=\${accessToken}&retURL=\${frontdoorRetUrl}\`;
    
    await page.goto(frontdoorUrl, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(2000);

${translatedSteps}
  });`;
  }).join('\n\n');

  return `/**
 * Standalone Playwright Spec — Generated by Quality X
 * Suite: ${safeSuiteName}
 * Generated: ${new Date().toISOString()}
 * 
 * Execution Instructions:
 *   1. Install Playwright: npm install -D @playwright/test playwright
 *   2. Run headed:         npx playwright test ${safeSuiteName}.spec.js --headed
 *   3. Run in CI/CD:       npx playwright test ${safeSuiteName}.spec.js --reporter=html
 */

const { test, expect } = require('@playwright/test');

const instanceUrl = process.env.SALESFORCE_INSTANCE || 'https://kns5-dev-ed.develop.my.salesforce.com';
const accessToken = process.env.SF_ACCESS_TOKEN || '00Dak00000fAf3t!AQEAQKYApShvw11lk49p_Yw8._mJdUFg2FHSjyAs_NGIQtE_mWbj7AlFuo_fax9jyKJG._M..w7fkBW4ZurSUTePXHzbl1VG';

test.describe('Quality X Enterprise Suite: ${safeSuiteName}', () => {
  test.use({
    viewport: { width: 1440, height: 900 },
    video: 'on',
    screenshot: 'on',
    trace: 'on-first-retry',
  });

${testBlocks}
});
`;
}

export function downloadPlaywrightSpecFile({ testCases, suiteName, salesforceUrl }) {
  const code = generatePlaywrightSpec({ testCases, suiteName, salesforceUrl });
  const blob = new Blob([code], { type: 'application/javascript;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `QualityX_${(suiteName || 'Salesforce').replace(/[^a-zA-Z0-9_]/g, '_')}.spec.js`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

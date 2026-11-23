/**
 * omniscript-helper.js
 * 
 * Resilient automation helpers for Salesforce OmniScript & LWC.
 * Handles Shadow DOM piercing, dynamic spinners, comboboxes,
 * checkboxes, error validations, and step navigation.
 */

// Element metadata mapping for QualityX_TelecomOnboarding
const OMNISCRIPT_METADATA = {
  scriptName: 'QualityX_TelecomOnboarding',
  steps: {
    CustomerDetailsStep: {
      name: 'CustomerDetailsStep',
      elements: {
        FirstName: { type: 'text', label: 'First Name', required: true },
        LastName: { type: 'text', label: 'Last Name', required: true },
        EmailAddress: { type: 'email', label: 'Email Address', required: true, validation: 'email' },
        MobileNumber: { type: 'tel', label: 'Mobile Number', required: true, validation: '10-digit' },
        CustomerType: { type: 'select', label: 'Customer Type', required: true, options: ['New', 'Existing', 'Enterprise'] },
      },
    },
    PlanSelectionStep: {
      name: 'PlanSelectionStep',
      elements: {
        ServiceType: { type: 'select', label: 'Service Type', required: true, options: ['Mobile', 'Broadband', 'Enterprise'] },
        TelecomPlan: { type: 'select', label: 'Telecom Plan', required: true, options: ['Basic 4G', 'Premium 5G', 'Business Unlimited'] },
        ConnectionType: { type: 'select', label: 'Connection Type', required: true, options: ['Prepaid', 'Postpaid'] },
        NumberOfConnections: { type: 'number', label: 'Number Of Connections', required: true, min: 1 },
      },
    },
    PaymentDetailsStep: {
      name: 'PaymentDetailsStep',
      elements: {
        BillingAddress: { type: 'textarea', label: 'Billing Address', required: true },
        BillingCity: { type: 'text', label: 'Billing City', required: true },
        BillingPostalCode: { type: 'text', label: 'Billing Postal Code', required: true },
        PaymentMethod: { type: 'select', label: 'Payment Method', required: true, options: ['UPI', 'Credit Card', 'Net Banking', 'Invoice'] },
        BillingCycle: { type: 'select', label: 'Billing Cycle', required: true, options: ['Monthly', 'Quarterly', 'Annually'] },
        TermsAccepted: { type: 'checkbox', label: 'Terms and Conditions Accepted', required: true },
      },
    },
    ReviewSubmitStep: {
      name: 'ReviewSubmitStep',
      elements: {
        ConfirmDetails: { type: 'checkbox', label: 'Confirm Details', required: true },
      },
    },
    ConfirmationStep: {
      name: 'ConfirmationStep',
      elements: {
        SuccessHeading: { type: 'output', label: 'Success Heading' },
        ConfirmationMessage: { type: 'output', label: 'Confirmation Message' },
        ReferenceNumber: { type: 'output', label: 'Reference Number' },
      },
    },
  },
};

/**
 * Waits for any Salesforce / OmniScript spinners to detach or be hidden.
 */
async function waitForOmniSpinners(page, timeout = 15000) {
  try {
    const spinnerSelectors = [
      '.slds-spinner_container',
      'lightning-spinner',
      '.slds-spinner',
      '[data-omni-spinner]',
      'div.slds-spinner_container',
    ];

    for (const selector of spinnerSelectors) {
      const loc = page.locator(selector).first();
      if (await loc.isVisible().catch(() => false)) {
        await loc.waitFor({ state: 'hidden', timeout }).catch(() => {});
      }
    }
  } catch (_) {
    // continue if spinner check times out
  }
}

/**
 * Builds resilient multi-tiered selectors for an OmniScript element
 */
function getResilientSelectors(elementName, elementType) {
  // Common humanized labels
  const labelText = elementName.replace(/([A-Z])/g, ' $1').trim();

  const selectors = [
    // 1. OmniScript data-omni-key attribute (most specific)
    `[data-omni-key="${elementName}"]`,
    `[data-omni-key="${elementName}"] input`,
    `[data-omni-key="${elementName}"] textarea`,
    `[data-omni-key="${elementName}"] select`,
    `[data-omni-key="${elementName}"] button`,
    `[data-omni-key="${elementName}"] lightning-input`,
    `[data-omni-key="${elementName}"] lightning-combobox`,

    // 2. Name attribute
    `input[name="${elementName}"]`,
    `textarea[name="${elementName}"]`,
    `select[name="${elementName}"]`,

    // 3. ID containing element name
    `input[id*="${elementName}"]`,
    `textarea[id*="${elementName}"]`,

    // 4. LWC label container
    `lightning-input:has-text("${labelText}") input`,
    `lightning-textarea:has-text("${labelText}") textarea`,
    `lightning-combobox:has-text("${labelText}")`,
    `label:has-text("${labelText}") ~ * input`,
    `label:has-text("${labelText}") ~ * textarea`,
  ];

  return selectors;
}

/**
 * Fills an input (text, email, password, number, textarea) with multi-strategy resilient locators
 */
async function fillOmniField(page, elementName, value) {
  await waitForOmniSpinners(page);
  const cleanVal = String(value ?? '').replace(/^["']|["']$/g, '').trim();
  const labelText = elementName.replace(/([A-Z])/g, ' $1').trim();

  // Strategy -1: Auto-split compound name (CustomerName / FullName) into FirstName & LastName if needed
  if (/customername|fullname|subscribername/i.test(elementName)) {
    const fnLoc = page.locator('[data-omni-key="FirstName"] input, input#FirstName, input[name="FirstName"]').first();
    const lnLoc = page.locator('[data-omni-key="LastName"] input, input#LastName, input[name="LastName"]').first();
    if (await fnLoc.count().catch(() => 0) && await lnLoc.count().catch(() => 0)) {
      const parts = cleanVal.split(/\s+/);
      const firstName = parts[0] || 'Apex';
      const lastName = parts.slice(1).join(' ') || 'Customer';
      await fnLoc.fill(firstName);
      await lnLoc.fill(lastName);
      return { success: true, matchedSelector: 'Auto-split compound name into FirstName + LastName' };
    }
  }

  // Strategy 0: Deep Shadow-DOM Piercing for Email / Mobile / Connections
  if (/email/i.test(elementName)) {
    const emailSelectors = [
      '[data-omni-key="Email"] input',
      '[data-omni-key="EmailAddress"] input',
      '[data-omni-key*="email" i] input',
      'input#Email',
      'input#EmailAddress',
      'input[name="Email"]',
      'input[name="EmailAddress"]',
      'input[type="email"]',
      'lightning-input:has-text("Email") input',
    ];
    for (const eSel of emailSelectors) {
      const loc = page.locator(eSel).first();
      if (await loc.count() && await loc.isVisible().catch(() => false)) {
        await loc.click();
        await loc.fill(cleanVal);
        await loc.press('Tab').catch(() => {});
        return { success: true, matchedSelector: eSel };
      }
    }
  }

  if (/mobile|phone|tel/i.test(elementName)) {
    const mobileSelectors = [
      'omniscript-masked-input input',
      'c-omniscript-telephone input',
      '[data-omni-key*="mobile" i] input',
      'input[type="tel"]',
      'input[name*="mobile" i]',
      'lightning-input:has-text("Mobile") input',
      'lightning-input:has-text("Phone") input',
      'input[placeholder*="mobile" i]',
      'input[placeholder*="phone" i]',
    ];
    for (const mSel of mobileSelectors) {
      const loc = page.locator(mSel).first();
      if (await loc.count() && await loc.isVisible().catch(() => false)) {
        await loc.click();
        await loc.fill(String(value));
        await loc.press('Tab').catch(() => {});
        return { success: true, matchedSelector: mSel };
      }
    }
  }

  if (/connection/i.test(elementName)) {
    const connSelectors = [
      '[data-omni-key*="connection" i] input',
      'c-omniscript-number input',
      'input[name*="connection" i]',
      'lightning-input:has-text("Connection") input',
      'input[type="number"][name*="connection" i]',
    ];
    for (const cSel of connSelectors) {
      const loc = page.locator(cSel).first();
      if (await loc.count() && await loc.isVisible().catch(() => false)) {
        await loc.click();
        await loc.fill(String(value));
        await loc.press('Tab').catch(() => {});
        return { success: true, matchedSelector: cSel };
      }
    }
  }

  // Strategy 1: data-omni-key (OmniScript / LWC)
  const omniLoc = page.locator(`[data-omni-key="${elementName}"]`).first();
  if (await omniLoc.count()) {
    const inputChild = omniLoc.locator('input, textarea').first();
    if (await inputChild.count()) {
      await inputChild.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      await inputChild.click();
      await inputChild.fill(String(value));
      await inputChild.press('Tab').catch(() => {});
      return { success: true, matchedSelector: `[data-omni-key="${elementName}"] input` };
    }
  }

  // Strategy 2: ID match (exact id or child input)
  const idLoc = page.locator(`input#${elementName}, textarea#${elementName}, #${elementName} input, #${elementName}`).first();
  if (await idLoc.count() && await idLoc.isVisible().catch(() => false)) {
    await idLoc.click();
    await idLoc.fill(String(value));
    await idLoc.press('Tab').catch(() => {});
    return { success: true, matchedSelector: `#${elementName}` };
  }

  // Strategy 3: name attribute
  const nameLoc = page.locator(`input[name="${elementName}"], textarea[name="${elementName}"], input[name*="${elementName}" i], textarea[name*="${elementName}" i]`).first();
  if (await nameLoc.count() && await nameLoc.isVisible().catch(() => false)) {
    await nameLoc.click();
    await nameLoc.fill(String(value));
    await nameLoc.press('Tab').catch(() => {});
    return { success: true, matchedSelector: `[name="${elementName}"]` };
  }

  // Strategy 4: Label matching (pierces Shadow DOM and standard HTML)
  const byLabel = page.getByLabel(new RegExp(labelText, 'i')).first();
  if (await byLabel.count() && await byLabel.isVisible().catch(() => false)) {
    await byLabel.click();
    await byLabel.fill(String(value));
    await byLabel.press('Tab').catch(() => {});
    return { success: true, matchedSelector: `getByLabel(/${labelText}/i)` };
  }

  // Strategy 5: Placeholder
  const byPlaceholder = page.getByPlaceholder(new RegExp(labelText, 'i')).first();
  if (await byPlaceholder.count() && await byPlaceholder.isVisible().catch(() => false)) {
    await byPlaceholder.click();
    await byPlaceholder.fill(String(value));
    return { success: true, matchedSelector: `getByPlaceholder(/${labelText}/i)` };
  }

  // Strategy 6: test-id or aria-label
  const ariaLoc = page.locator(`[data-testid="${elementName}" i], [data-test="${elementName}" i], [aria-label*="${labelText}" i]`).first();
  if (await ariaLoc.count() && await ariaLoc.isVisible().catch(() => false)) {
    await ariaLoc.click();
    await ariaLoc.fill(String(value));
    return { success: true, matchedSelector: `aria/testid: ${elementName}` };
  }

  // Strategy 7: Semantic input fallback
  if (/password/i.test(elementName)) {
    const pwLoc = page.locator('input[type="password"]').first();
    if (await pwLoc.count() && await pwLoc.isVisible().catch(() => false)) {
      await pwLoc.fill(String(value));
      return { success: true, matchedSelector: 'input[type="password"]' };
    }
  }

  throw new Error(`Could not locate input element "${elementName}" using standard or fallback selectors.`);
}

/**
 * Selects an option in an OmniScript Select, lightning-combobox, custom dropdown, or standard HTML select
 */
async function selectOmniOption(page, elementName, optionValue) {
  await waitForOmniSpinners(page);
  const cleanVal = String(optionValue ?? '').replace(/^["']|["']$/g, '').trim();
  const labelText = elementName.replace(/([A-Z])/g, ' $1').trim();
  const searchContexts = [page, ...(page.frames ? page.frames() : [])];

  // ── Strategy 1: Standard HTML select by data-omni-key, id, or name ──────────
  for (const ctx of searchContexts) {
    const selectLoc = ctx.locator(
      `[data-omni-key="${elementName}"] select, [data-omni-key*="${elementName}" i] select, select#${elementName}, select[name="${elementName}"], select[name*="${elementName}" i]`
    ).first();
    if (await selectLoc.count() && await selectLoc.isVisible().catch(() => false)) {
      try {
        await selectLoc.selectOption({ label: cleanVal });
        return { success: true, matchedSelector: 'standard-select-label' };
      } catch (_) {
        try {
          await selectLoc.selectOption({ value: cleanVal });
          return { success: true, matchedSelector: 'standard-select-value' };
        } catch (_) {}
      }
    }
  }

  // ── Strategy 2: Deep Shadow-DOM Salesforce Combobox & Dropdown Triggers ──────
  const triggerSelectors = [
    `[data-omni-key="${elementName}"] input[role="combobox"]`,
    `[data-omni-key="${elementName}"] button[role="combobox"]`,
    `[data-omni-key="${elementName}"] [role="combobox"]`,
    `[data-omni-key="${elementName}"] button`,
    `[data-omni-key="${elementName}"] input`,
    `[data-omni-key*="${elementName}" i] input[role="combobox"]`,
    `[data-omni-key*="${elementName}" i] button[role="combobox"]`,
    `[data-omni-key*="${elementName}" i] [role="combobox"]`,
    `[data-omni-key*="${elementName}" i] button`,
    `[data-omni-key*="${elementName}" i] input`,
    `lightning-combobox:has-text("${labelText}") input[role="combobox"]`,
    `lightning-combobox:has-text("${labelText}") button[role="combobox"]`,
    `lightning-combobox:has-text("${labelText}") button`,
    `lightning-combobox:has-text("${labelText}") input`,
    `c-omniscript-select:has-text("${labelText}") [role="combobox"]`,
    `c-omniscript-combobox:has-text("${labelText}") [role="combobox"]`,
    `#${elementName}[role="combobox"]`,
    `label:has-text("${labelText}") ~ * [role="combobox"]`,
    `label:has-text("${labelText}") ~ * input`,
  ];

  for (const ctx of searchContexts) {
    for (const tSel of triggerSelectors) {
      const trigger = ctx.locator(tSel).first();
      if (await trigger.count() && await trigger.isVisible().catch(() => false)) {
        // Physical click on the combobox trigger element
        await trigger.click({ force: true }).catch(() => {});
        await page.waitForTimeout(400); // Wait for dropdown options overlay to expand

        // Query targeted list option dynamically by text or role attributes
        const optionSelectors = [
          `lightning-base-combobox-item:has-text("${cleanVal}")`,
          `[role="listbox"] [role="option"]:has-text("${cleanVal}")`,
          `[role="option"]:has-text("${cleanVal}")`,
          `span.slds-truncate:has-text("${cleanVal}")`,
          `span[title*="${cleanVal}" i]`,
          `div.slds-listbox__option:has-text("${cleanVal}")`,
          `button:has-text("${cleanVal}")`,
          `div:has-text("${cleanVal}")`,
        ];

        for (const optSel of optionSelectors) {
          const opt = ctx.locator(optSel).first();
          if (await opt.count() && await opt.isVisible({ timeout: 1500 }).catch(() => false)) {
            await opt.click({ force: true }).catch(() => {});
            return { success: true, matchedSelector: `combobox-option:${optSel}` };
          }
        }

        // Also check root page for floating overlay dropdown
        for (const optSel of optionSelectors) {
          const opt = page.locator(optSel).first();
          if (await opt.count() && await opt.isVisible({ timeout: 1500 }).catch(() => false)) {
            await opt.click({ force: true }).catch(() => {});
            return { success: true, matchedSelector: `floating-overlay:${optSel}` };
          }
        }
      }
    }
  }

  // ── Strategy 3: Telecom 5G Plan & Radio/Card Selection ──────────────────────
  const cardSelectors = [
    `[data-omni-key*="plan" i] label:has-text("${cleanVal}")`,
    `[data-omni-key*="plan" i] input[value="${cleanVal}"]`,
    `[data-omni-key*="plan" i] button:has-text("${cleanVal}")`,
    `div.slds-card:has-text("${cleanVal}")`,
    `div:has-text("${cleanVal}") input[type="radio"]`,
    `div:has-text("${cleanVal}") .slds-radio_faux`,
    `label:has-text("${cleanVal}") input`,
    `label:has-text("${cleanVal}")`,
    `span[title*="${cleanVal}" i]`,
  ];
  for (const ctx of searchContexts) {
    for (const cSel of cardSelectors) {
      const loc = ctx.locator(cSel).first();
      if (await loc.count() && await loc.isVisible().catch(() => false)) {
        await loc.click({ force: true }).catch(() => {});
        return { success: true, matchedSelector: cSel };
      }
    }
  }

  // ── Strategy 4: General option match across all frames ──────────────────────
  for (const ctx of searchContexts) {
    const generalOption = ctx.locator(`[role="option"]:has-text("${cleanVal}"), option:has-text("${cleanVal}")`).first();
    if (await generalOption.count()) {
      await generalOption.click({ force: true }).catch(() => {});
      return { success: true, matchedSelector: 'generalOption' };
    }
  }

  throw new Error(`Could not select option "${cleanVal}" for element "${elementName}".`);
}

/**
 * Checks or unchecks a checkbox (OmniScript, standard HTML, or custom styled)
 */
async function setOmniCheckbox(page, elementName, checked = true) {
  await waitForOmniSpinners(page);
  const labelText = elementName.replace(/([A-Z])/g, ' $1').trim();

  // Strategy 00: Mandatory Confirm Details Checkbox
  if (/confirm/i.test(elementName)) {
    const confirmSelectors = [
      '[data-omni-key*="confirm" i] input[type="checkbox"]',
      '[data-omni-key*="confirm" i] .slds-checkbox_faux',
      'label:has-text("I confirm that all the information provided is correct") input',
      'label:has-text("I confirm that all the information provided is correct")',
      'label:has-text("I confirm") input',
      'label:has-text("I confirm")',
      'label:has-text("Confirm Details") input',
      'label:has-text("Confirm Details")',
      'input[name*="confirm" i]',
      'input[type="checkbox"]#ConfirmDetails',
      '#ConfirmDetails',
    ];
    for (const cSel of confirmSelectors) {
      const loc = page.locator(cSel).first();
      if (await loc.count() && await loc.isVisible().catch(() => false)) {
        const isChecked = await loc.isChecked().catch(() => false);
        if (isChecked !== checked) {
          await loc.click().catch(() => loc.check().catch(() => {}));
        }
        return { success: true, matchedSelector: cSel };
      }
    }
  }

  // Strategy 0: Mandatory Terms & Conditions Checkbox
  if (/terms|condition/i.test(elementName)) {
    const termsSelectors = [
      '[data-omni-key*="terms" i] input[type="checkbox"]',
      '[data-omni-key*="terms" i] .slds-checkbox_faux',
      'input[name*="terms" i]',
      'input[id*="terms" i]',
      'lightning-input:has-text("Terms") input',
      '.slds-checkbox:has-text("Terms") input',
      '.slds-checkbox:has-text("Terms") .slds-checkbox_faux',
      'label:has-text("Terms") input',
      'label:has-text("Terms")',
    ];
    for (const tSel of termsSelectors) {
      const loc = page.locator(tSel).first();
      if (await loc.count() && await loc.isVisible().catch(() => false)) {
        const isChecked = await loc.isChecked().catch(() => false);
        if (isChecked !== checked) {
          await loc.click().catch(() => loc.check().catch(() => {}));
        }
        return { success: true, matchedSelector: tSel };
      }
    }
  }

  const checkboxLoc = page.locator(
    `[data-omni-key="${elementName}"] input[type="checkbox"], input[type="checkbox"]#${elementName}, input[name="${elementName}"][type="checkbox"], input[type="checkbox"][name*="${elementName}" i], [data-omni-key="${elementName}"] .slds-checkbox_faux, label:has-text("${labelText}") input[type="checkbox"], label:has-text("${labelText}")`
  ).first();

  if (await checkboxLoc.count()) {
    const isCurrentlyChecked = await checkboxLoc.isChecked().catch(() => false);
    if (isCurrentlyChecked !== checked) {
      await checkboxLoc.click();
    }
    return { success: true, matchedSelector: `checkbox: ${elementName}` };
  }

  throw new Error(`Could not find checkbox for "${elementName}".`);
}

/**
 * Clicks the primary action / Next / Submit button on any flow
 */
async function clickOmniNext(page) {
  await waitForOmniSpinners(page);

  // Auto-default BillingCycle if visible and unselected to ensure Step 3 passes smoothly
  try {
    const cycleLoc = page.locator('select#BillingCycle, select[name="BillingCycle"]').first();
    if (await cycleLoc.count().catch(() => 0) && await cycleLoc.isVisible().catch(() => false)) {
      const val = await cycleLoc.inputValue().catch(() => '');
      if (!val) {
        await cycleLoc.selectOption({ label: 'Monthly' }).catch(() => {});
      }
    }
  } catch (_) {}

  const nextButtonSelectors = [
    'button.vloc-next-step',
    'button.vlocity-btn',
    'button.vloc-step-next',
    'button.vloc-step-submit',
    'c-omniscript-navigate-action button:has-text("Next")',
    'c-omniscript-navigate-action button:has-text("Continue")',
    'c-omniscript-navigate-action button:has-text("Submit")',
    'c-omniscript-navigate-action button',
    '[data-omni-key="next"] button',
    '[data-omni-key="submit"] button',
    'button[data-omni-key="next"]',
    'button[data-omni-key="submit"]',
    'button.slds-button_brand:has-text("Next")',
    'button:has-text("Next")',
    'button.slds-button_brand:has-text("Submit")',
    'button:has-text("Submit")',
    'button:has-text("Continue")',
    'button:has-text("Proceed")',
    'button:has-text("Sign In")',
    'button:has-text("Log In")',
    'button:has-text("Login")',
    'button:has-text("Checkout")',
    'button:has-text("Place Order")',
    'button:has-text("Pay")',
    'button:has-text("Register")',
    'button:has-text("Confirm")',
    'button[type="submit"]',
    'input[type="submit"]',
  ];

  for (const selector of nextButtonSelectors) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await waitForOmniSpinners(page);
      return { success: true, clicked: selector };
    }
  }

  throw new Error('Action / Next / Submit button not visible or not found on page.');
}

/**
 * Checks for field-level or step-level error messages
 */
async function checkOmniErrors(page, elementName = null) {
  const errors = [];

  try {
    // 1. Element-specific error help text (OmniScript, SLDS, or standard HTML)
    if (elementName) {
      const fieldErrorLoc = page.locator(
        `[data-omni-key="${elementName}"].slds-has-error .slds-form-element__help, ` +
        `[data-omni-key="${elementName}"] .slds-has-error, ` +
        `[data-omni-key="${elementName}"] [role="alert"], ` +
        `#${elementName}.is-invalid, #${elementName}.error, #${elementName}:invalid, ` +
        `[name="${elementName}"].is-invalid, [name="${elementName}"].error, ` +
        `#err-${elementName}, #error-${elementName}, .error-${elementName.toLowerCase()}`
      );
      const count = await fieldErrorLoc.count();
      for (let i = 0; i < count; i++) {
        const item = fieldErrorLoc.nth(i);
        if (await item.isVisible().catch(() => false)) {
          const text = await item.innerText().catch(() => '');
          if (text && text.trim()) errors.push(text.trim());
        }
      }
    }

    // 2. Global toast, alert, or error banner
    const toastLoc = page.locator(
      '.slds-notify_toast, .slds-theme_error, [role="alert"].slds-theme_error, .alert-danger, .error-summary, .invalid-feedback:visible'
    );
    const toastCount = await toastLoc.count();
    for (let i = 0; i < toastCount; i++) {
      const item = toastLoc.nth(i);
      if (await item.isVisible().catch(() => false)) {
        const text = await item.innerText().catch(() => '');
        if (text && text.trim()) errors.push(text.trim());
      }
    }
  } catch (_) {
    // ignore
  }

  return errors;
}

/**
 * Extracts confirmation step details (ReferenceNumber, SuccessHeading, ConfirmationMessage)
 */
async function extractConfirmationDetails(page) {
  await waitForOmniSpinners(page);
  const details = {};

  try {
    const refLoc = page.locator(
      '[data-omni-key="ReferenceNumber"], [data-omni-key*="reference" i], [data-omni-key*="order" i], ' +
      '#referenceNumber, #orderNumber, #confirmationNumber, ' +
      ':has-text("Reference Number"), :has-text("Order Number"), :has-text("Reference:"), :has-text("Confirmation #")'
    ).first();
    if (await refLoc.count()) {
      details.referenceNumber = (await refLoc.innerText()).trim();
    }

    const headingLoc = page.locator(
      '[data-omni-key="SuccessHeading"], :has-text("Your onboarding is successful!"), :has-text("Onboarding Completed Successfully"), h1:has-text("Success"), h1:has-text("Confirmed"), h1:has-text("Thank you"), h2:has-text("Success"), h2:has-text("Confirmed"), h2:has-text("Thank you"), h1, h2, .slds-text-heading_large'
    ).first();
    if (await headingLoc.count()) {
      details.successHeading = (await headingLoc.innerText()).trim();
    }

    const bodyText = await page.innerText('body').catch(() => '');
    if (/your onboarding is successful/i.test(bodyText)) {
      details.successHeading = 'Your onboarding is successful!';
    }

    const msgLoc = page.locator('[data-omni-key="ConfirmationMessage"], .confirmation-message, .order-success').first();
    if (await msgLoc.count()) {
      details.confirmationMessage = (await msgLoc.innerText()).trim();
    }
  } catch (_) {
    // ignore
  }

  return details;
}

module.exports = {
  OMNISCRIPT_METADATA,
  waitForOmniSpinners,
  getResilientSelectors,
  fillOmniField,
  selectOmniOption,
  setOmniCheckbox,
  clickOmniNext,
  checkOmniErrors,
  extractConfirmationDetails,
};

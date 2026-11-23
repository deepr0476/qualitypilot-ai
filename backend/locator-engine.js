/**
 * locator-engine.js
 * 
 * Quality X — 3-Tier Semantic Locator Engine & Self-Updating Object Repository
 * 
 * Architecture:
 * 1. Deep Multi-Frame Search: Inspects the main Playwright page + ALL nested frames()
 *    (Salesforce CPQ iframes, Visualforce pages, LWC shadow DOM).
 * 2. Strict Semantic Priority:
 *    getByRole -> getByLabel -> getByPlaceholder -> getByTitle -> attribute/text match.
 * 3. Self-Updating Object Repository:
 *    Caches verified working locators in backend/object-repository.json.
 * 4. Self-Healing AI & Heuristic Fallback:
 *    If a Salesforce release or UI change breaks a locator, dynamically inspects live DOM,
 *    identifies the shifted element, updates object-repository.json, and continues execution.
 */

const fs = require('fs');
const path = require('path');

const REPO_FILE = path.join(__dirname, 'object-repository.json');

class LocatorEngine {
  constructor(repoPath = REPO_FILE) {
    this.repoPath = repoPath;
    this.repository = this.loadRepository();
  }

  loadRepository() {
    try {
      if (fs.existsSync(this.repoPath)) {
        const raw = fs.readFileSync(this.repoPath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[LocatorEngine] Error loading object repository:', err.message);
    }
    return { version: '1.0.0', lastUpdated: new Date().toISOString(), locators: {} };
  }

  saveRepository() {
    try {
      this.repository.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.repoPath, JSON.stringify(this.repository, null, 2), 'utf8');
    } catch (err) {
      console.warn('[LocatorEngine] Error saving object repository:', err.message);
    }
  }

  getRepoKey(contextName, label, roleHint) {
    const ctx = (contextName || 'Global').replace(/[^a-zA-Z0-9_]/g, '');
    const cleanLabel = (label || '').replace(/[^a-zA-Z0-9_]/g, '');
    const role = (roleHint || 'any').toLowerCase();
    return `${ctx}.${cleanLabel}.${role}`;
  }

  recordSuccess(repoKey, selector, strategy) {
    if (!this.repository.locators) this.repository.locators = {};
    const existing = this.repository.locators[repoKey] || {};
    this.repository.locators[repoKey] = {
      selector,
      strategy,
      successCount: (existing.successCount || 0) + 1,
      lastSuccess: new Date().toISOString(),
    };
    this.saveRepository();
  }

  recordHealed(repoKey, oldSelector, newSelector, reason) {
    if (!this.repository.locators) this.repository.locators = {};
    this.repository.locators[repoKey] = {
      selector: newSelector,
      previousSelector: oldSelector,
      strategy: 'self-healed',
      successCount: 1,
      healedAt: new Date().toISOString(),
      healReason: reason || 'DOM drift detected and automatically healed',
    };
    console.log(`[LocatorEngine - Self-Healing] Repaired locator for "${repoKey}":`, newSelector);
    this.saveRepository();
  }

  /**
   * Returns an array of search contexts: the page itself plus all attached frames (CPQ/VF/etc.)
   */
  getAllContexts(page) {
    if (!page) return [];
    const contexts = [page];
    try {
      const frames = page.frames();
      for (const frame of frames) {
        if (frame && frame !== page.mainFrame()) {
          contexts.push(frame);
        }
      }
    } catch (_) {}
    return contexts;
  }

  /**
   * 3-Tier Semantic Locator with Frame Traversal & Self-Healing
   */
  async smartLocate(page, label, roleHint = 'input', options = {}) {
    if (!page || !label) {
      throw new Error('[LocatorEngine] page and label are required for smartLocate');
    }

    const {
      contextName = 'Global',
      timeout = 3000,
      scopeLocator = null,
      exact = false,
    } = options;

    const repoKey = this.getRepoKey(contextName, label, roleHint);
    const contexts = scopeLocator ? [scopeLocator] : this.getAllContexts(page);

    // ── Tier 0: Check Object Repository Cache ──────────────────────────────
    const cached = this.repository.locators?.[repoKey];
    if (cached && cached.selector) {
      for (const ctx of contexts) {
        try {
          const loc = ctx.locator(cached.selector).first();
          if (await loc.isVisible({ timeout: 1200 }).catch(() => false)) {
            return {
              locator: loc,
              selector: cached.selector,
              context: ctx,
              tier: 'Tier 0: Cached Repository',
              source: 'cache',
            };
          }
        } catch (_) {}
      }
    }

    // ── Tier 1: Semantic Roles & Labels Priority ─────────────────────────────
    const camel = label.charAt(0).toLowerCase() + label.slice(1);
    const spaced = label.replace(/([A-Z])/g, ' $1').trim();
    const cleanSpaced = spaced.replace(/[\*\:]/g, '').trim();

    for (const ctx of contexts) {
      // 1. getByRole
      if (roleHint && roleHint !== 'any') {
        try {
          const roleLoc = ctx.getByRole(roleHint, { name: new RegExp(cleanSpaced, 'i'), exact }).first();
          if (await roleLoc.isVisible({ timeout: 1000 }).catch(() => false)) {
            const sel = `${roleHint}:has-text("${cleanSpaced}")`;
            this.recordSuccess(repoKey, sel, 'getByRole');
            return { locator: roleLoc, selector: sel, context: ctx, tier: 'Tier 1: getByRole' };
          }
        } catch (_) {}
      }

      // 2. getByLabel
      for (const lbl of [cleanSpaced, label, camel]) {
        try {
          const labelLoc = ctx.getByLabel(lbl, { exact }).first();
          if (await labelLoc.isVisible({ timeout: 1000 }).catch(() => false)) {
            const sel = `[aria-label*="${lbl}"]`;
            this.recordSuccess(repoKey, sel, 'getByLabel');
            return { locator: labelLoc, selector: sel, context: ctx, tier: 'Tier 1: getByLabel' };
          }
        } catch (_) {}
      }

      // 3. Direct Lightning Web Component / Standard HTML attributes
      const directCandidates = [];
      if (roleHint === 'button' || roleHint === 'link') {
        directCandidates.push(
          `button[name="${label}"]`,
          `button[name="${camel}"]`,
          `button:has-text("${cleanSpaced}")`,
          `a:has-text("${cleanSpaced}")`,
          `button[title="${cleanSpaced}"]`,
          `a[title="${cleanSpaced}"]`,
          `.slds-button:has-text("${cleanSpaced}")`,
          `button:has-text("${label}")`
        );
      } else if (roleHint === 'combobox' || roleHint === 'select') {
        directCandidates.push(
          `lightning-combobox[data-field="${label}"] button`,
          `lightning-combobox[data-field="${camel}"] button`,
          `button[aria-label*="${cleanSpaced}" i]`,
          `button[aria-label*="${label}" i]`,
          `div[role="combobox"]:has-text("${cleanSpaced}")`,
          `select[name="${camel}"]`,
          `select[name="${label}"]`
        );
      } else {
        // Inputs & Textareas
        directCandidates.push(
          `input[name="${camel}"]`,
          `input[name="${label}"]`,
          `textarea[name="${camel}"]`,
          `textarea[name="${label}"]`,
          `lightning-input[data-field="${label}"] input`,
          `lightning-input[data-field="${camel}"] input`,
          `lightning-textarea[data-field="${label}"] textarea`,
          `input[name*="${camel}" i]`,
          `input[aria-label*="${cleanSpaced}" i]`
        );
      }

      for (const sel of directCandidates) {
        try {
          const candLoc = ctx.locator(sel).first();
          if (await candLoc.isVisible({ timeout: 800 }).catch(() => false)) {
            this.recordSuccess(repoKey, sel, 'directCandidate');
            return { locator: candLoc, selector: sel, context: ctx, tier: 'Tier 1: Direct LWC Attribute' };
          }
        } catch (_) {}
      }

      // 4. getByPlaceholder
      try {
        const phLoc = ctx.getByPlaceholder(cleanSpaced, { exact }).first();
        if (await phLoc.isVisible({ timeout: 800 }).catch(() => false)) {
          const sel = `[placeholder*="${cleanSpaced}"]`;
          this.recordSuccess(repoKey, sel, 'getByPlaceholder');
          return { locator: phLoc, selector: sel, context: ctx, tier: 'Tier 1: getByPlaceholder' };
        }
      } catch (_) {}

      // 5. getByTitle
      try {
        const titleLoc = ctx.getByTitle(cleanSpaced, { exact }).first();
        if (await titleLoc.isVisible({ timeout: 800 }).catch(() => false)) {
          const sel = `[title*="${cleanSpaced}"]`;
          this.recordSuccess(repoKey, sel, 'getByTitle');
          return { locator: titleLoc, selector: sel, context: ctx, tier: 'Tier 1: getByTitle' };
        }
      } catch (_) {}
    }

    // ── Tier 2: Heuristic DOM Scan & Self-Healing ─────────────────────────────
    console.warn(`[LocatorEngine] Standard locators missed for "${label}". Initiating Tier 2 Self-Healing DOM Inspection...`);
    
    for (const ctx of contexts) {
      try {
        const healedSelector = await ctx.evaluate(({ targetLabel, rHint }) => {
          const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const target = norm(targetLabel);

          let elements = [];
          if (rHint === 'button') {
            elements = Array.from(document.querySelectorAll('button, a[role="button"], input[type="submit"], input[type="button"], .slds-button'));
          } else if (rHint === 'combobox') {
            elements = Array.from(document.querySelectorAll('button[role="combobox"], [role="combobox"], lightning-combobox button, select'));
          } else {
            elements = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, [contenteditable="true"]'));
          }

          let bestMatch = null;
          let bestScore = -1;

          for (const el of elements) {
            // Check visibility
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0 || window.getComputedStyle(el).visibility === 'hidden') continue;

            const name = norm(el.getAttribute('name'));
            const ariaLabel = norm(el.getAttribute('aria-label'));
            const placeholder = norm(el.getAttribute('placeholder'));
            const title = norm(el.getAttribute('title'));
            const text = norm(el.innerText || el.textContent);
            const dataField = norm(el.getAttribute('data-field'));

            // Check associated label
            let labelText = '';
            if (el.id) {
              const lbl = document.querySelector(`label[for="${el.id}"]`);
              if (lbl) labelText = norm(lbl.innerText);
            }
            if (!labelText && el.closest('label')) {
              labelText = norm(el.closest('label').innerText);
            }
            if (!labelText && el.closest('lightning-input, lightning-combobox, lightning-textarea')) {
              const comp = el.closest('lightning-input, lightning-combobox, lightning-textarea');
              const compLbl = comp.querySelector('label, .slds-form-element__label');
              if (compLbl) labelText = norm(compLbl.innerText);
            }

            let score = 0;
            if (name && (name.includes(target) || target.includes(name))) score += 50;
            if (ariaLabel && (ariaLabel.includes(target) || target.includes(ariaLabel))) score += 40;
            if (labelText && (labelText.includes(target) || target.includes(labelText))) score += 45;
            if (dataField && (dataField.includes(target) || target.includes(dataField))) score += 50;
            if (placeholder && (placeholder.includes(target) || target.includes(placeholder))) score += 30;
            if (title && (title.includes(target) || target.includes(title))) score += 25;
            if (text && (text.includes(target) || target.includes(text))) score += 20;

            if (score > bestScore && score >= 20) {
              bestScore = score;
              // Generate resilient unique CSS selector
              let generatedSel = '';
              if (el.getAttribute('name')) {
                generatedSel = `${el.tagName.toLowerCase()}[name="${el.getAttribute('name')}"]`;
              } else if (el.getAttribute('data-field')) {
                generatedSel = `[data-field="${el.getAttribute('data-field')}"] ${el.tagName.toLowerCase()}`;
              } else if (el.getAttribute('aria-label')) {
                generatedSel = `${el.tagName.toLowerCase()}[aria-label*="${el.getAttribute('aria-label').slice(0, 30)}"]`;
              } else if (el.id) {
                generatedSel = `#${el.id}`;
              } else {
                generatedSel = el.tagName.toLowerCase();
              }
              bestMatch = { selector: generatedSel, score };
            }
          }

          return bestMatch ? bestMatch.selector : null;
        }, { targetLabel: label, rHint: roleHint });

        if (healedSelector) {
          const healedLoc = ctx.locator(healedSelector).first();
          if (await healedLoc.isVisible({ timeout: 1500 }).catch(() => false)) {
            this.recordHealed(repoKey, cached?.selector || 'none', healedSelector, 'Auto-healed via Tier 2 Semantic DOM Inspection');
            return {
              locator: healedLoc,
              selector: healedSelector,
              context: ctx,
              tier: 'Tier 2: Self-Healed Heuristic',
              source: 'self-healed',
            };
          }
        }
      } catch (domErr) {
        console.warn(`[LocatorEngine] DOM evaluation failed on context:`, domErr.message);
      }
    }

    // ── Tier 3: Last Resort Fallback Text/Aria match ──────────────────────────
    for (const ctx of contexts) {
      try {
        const fallback = ctx.locator(`:text("${cleanSpaced}"), [aria-label*="${cleanSpaced}" i]`).first();
        if (await fallback.isVisible({ timeout: 1000 }).catch(() => false)) {
          return {
            locator: fallback,
            selector: `:text("${cleanSpaced}")`,
            context: ctx,
            tier: 'Tier 3: Fallback Text',
            source: 'fallback',
          };
        }
      } catch (_) {}
    }

    return null;
  }

  /**
   * Smart Click utility
   */
  async smartClick(page, label, options = {}) {
    const res = await this.smartLocate(page, label, 'button', options);
    if (!res || !res.locator) {
      // Try with any role
      const resAny = await this.smartLocate(page, label, 'any', options);
      if (!resAny || !resAny.locator) {
        throw new Error(`[LocatorEngine] Could not find clickable element for: "${label}"`);
      }
      await resAny.locator.scrollIntoViewIfNeeded().catch(() => {});
      await resAny.locator.click({ timeout: 5000 }).catch(async () => {
        await resAny.locator.evaluate(el => el.click());
      });
      return resAny;
    }

    await res.locator.scrollIntoViewIfNeeded().catch(() => {});
    await res.locator.click({ timeout: 5000 }).catch(async () => {
      await res.locator.evaluate(el => el.click());
    });
    return res;
  }

  /**
   * Smart Fill utility
   */
  async smartFill(page, label, value, options = {}) {
    const res = await this.smartLocate(page, label, 'textbox', options);
    if (!res || !res.locator) {
      throw new Error(`[LocatorEngine] Could not find input element for field: "${label}"`);
    }

    await res.locator.scrollIntoViewIfNeeded().catch(() => {});
    await res.locator.fill(String(value));
    await res.locator.dispatchEvent('change').catch(() => {});
    return res;
  }
}

module.exports = new LocatorEngine();

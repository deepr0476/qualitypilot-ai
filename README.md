# QualityPilot AI — 6-Agent "Quality X" Engine 🛡️

> Intelligent Salesforce OmniScript QA Automation Engine powered by `@google/generative-ai` (`gemini-2.5-flash`) and Playwright.

---

## 6-Agent "Quality X" Architecture

QualityPilot AI implements an autonomous 6-Agent orchestration pipeline designed specifically for Salesforce OmniScript (`QualityX_TelecomOnboarding`):

```
+--------------------------------------------------------------------------------------------------+
|                               6-Agent "Quality X" Engine                                          |
+--------------------------------------------------------------------------------------------------+
  [User Story / Ticket] ──>  Agent 01: Requirement Analyst  (/api/agent/analyze)
                                        │
                                        ▼
                             Agent 02: Test Designer        (/api/agent/design-tests)
                                        │
                                        ▼
                             Agent 03: QA Executor          (/api/execute-tests + auth.json)
                                        │
                                        ├── (Pass) ──> Evidence Screenshots (/evidence)
                                        │
                                        └── (Fail) ──> Capture DOM Snapshot + Screenshot
                                                            │
                                                            ▼
                                        ┌───────────────────────────────────────┐
                                        │ Agent 04: UI Change Investigator      │
                                        │ Agent 05: Self-Healing Reviewer       │
                                        │ Agent 06: Defect Analyst (Jira Bug)   │
                                        │ (/api/agent/heal-and-analyze)         │
                                        └───────────────────────────────────────┘
```

| Agent | Role | Endpoint / Script | Key Function |
|-------|------|-------------------|--------------|
| **Agent 01** | Requirement Analyst | `POST /api/agent/analyze` | Parses Jira story, extracts field rules, validations & acceptance criteria |
| **Agent 02** | Test Designer | `POST /api/agent/design-tests` | Designs 4-5 structured positive & negative test cases mapped to OmniScript elements |
| **Agent 03** | QA Executor | `POST /api/execute-tests` | Runs Playwright with `auth.json`, pierces Shadow DOM, handles spinners, saves DOM on fail |
| **Agent 04** | UI Change Investigator | `POST /api/agent/heal-and-analyze` | Inspects DOM and screenshot to detect shadow root shift or label rename |
| **Agent 05** | Self-Healing Reviewer | `POST /api/agent/heal-and-analyze` | Proposes resilient healed locators with confidence score and healed step |
| **Agent 06** | Defect Analyst | `POST /api/agent/heal-and-analyze` | Produces an industry-standard Jira Defect Bug Report for real application defects |

---

## Targeted OmniScript: `QualityX_TelecomOnboarding`

| Step | Elements & Rules |
|------|-----------------|
| **CustomerDetailsStep** | `FirstName` (Text, req), `LastName` (Text, req), `EmailAddress` (Email, req, RFC 5322), `MobileNumber` (10-digit Tel, req), `CustomerType` (Select: New, Existing, Enterprise, req) |
| **PlanSelectionStep** | `ServiceType` (Select: Mobile, Broadband, Enterprise), `TelecomPlan` (Select: Basic 4G, Premium 5G, Business Unlimited), `ConnectionType` (Select: Prepaid, Postpaid), `NumberOfConnections` (Number, min 1) |
| **PaymentDetailsStep** | `BillingAddress` (TextArea, req), `BillingCity` (Text, req), `BillingPostalCode` (Text, req), `PaymentMethod` (Select: UPI, Credit Card, Net Banking, Invoice), `BillingCycle` (Select: Monthly, Quarterly, Annually), `TermsAccepted` (Checkbox, req) |
| **ReviewSubmitStep** | `ConfirmDetails` (Checkbox, req prior to submitting) |
| **IP Integration** | `IPCreateTelecomCustomer` (Integration Procedure executed upon submit) |
| **ConfirmationStep** | `SuccessHeading`, `ConfirmationMessage`, `ReferenceNumber` |

## Local Mock OmniScript Runtime: `GET /mock-omniscript`

A high-fidelity Salesforce Lightning / OmniScript runtime page is built right into the backend at:
👉 **`http://localhost:4000/mock-omniscript`**

- Features authentic Salesforce Lightning Design System (SLDS) styling with global navigation bar, breadcrumb stepper, and `.slds-spinner_container`.
- Accurately replicates all 5 steps with live validation (email RFC regex, 10-digit mobile check, checkbox gating, and simulated Integration Procedure execution `IPCreateTelecomCustomer`).
- Allows complete zero-setup local testing of Playwright automated tests without needing access to a live Salesforce org or MFA credentials!

---

## Authentication: `backend/save-auth.js`

To run tests against an authenticated Salesforce org without hardcoding passwords in scripts:

```bash
cd backend
npm run save-auth
```

1. Opens a **headed Chromium browser** to `https://login.salesforce.com` (or your MyDomain URL).
2. Manually enter your credentials and complete **MFA / OTP** (Salesforce Authenticator app or SMS).
3. Once logged into the Salesforce home page, press `[ENTER]` in the terminal.
4. Your authenticated session cookies and storage state are saved to `backend/auth.json`.
5. Playwright automatically loads `auth.json` on all subsequent test runs!

---

## API Reference

### 1. `POST /api/agent/analyze` (Agent 01)
```json
// Request
{
  "ticketId": "SFQA-101",
  "userStory": "As a telecom customer, I want to onboard via QualityX_TelecomOnboarding OmniScript."
}

// Response
{
  "success": true,
  "agent": "Agent 01 - Requirement Analyst",
  "omniScriptName": "QualityX_TelecomOnboarding",
  "steps": [...],
  "businessRules": [...],
  "acceptanceCriteria": [...]
}
```

### 2. `POST /api/agent/design-tests` (Agent 02)
```json
// Request
{
  "ticketId": "SFQA-101",
  "requirements": { ... } // optional, defaults to QualityX_TelecomOnboarding hierarchy
}

// Response: 5 structured test cases
// - QX-TC-001 (Positive): E2E Telecom Customer Onboarding Happy Path
// - QX-TC-002 (Negative): CustomerDetailsStep - Invalid Email Format
// - QX-TC-003 (Negative): CustomerDetailsStep - Mobile Number 10-Digit Validation
// - QX-TC-004 (Negative): PaymentDetailsStep - Missing TermsAccepted Checkbox
// - QX-TC-005 (Negative): ReviewSubmitStep - Missing ConfirmDetails Checkbox
```

### 3. `POST /api/execute-tests` (Agent 03)
```json
{
  "ticketId": "SFQA-101",
  "salesforceUrl": "https://your-domain.lightning.force.com/...",
  "testCases": [...],
  "healOnFailure": true
}
```

### 4. `POST /api/agent/heal-and-analyze` (Agents 04, 05 & 06)
```json
{
  "testCase": { "id": "QX-TC-003", "targetStep": "CustomerDetailsStep" },
  "failedStep": "FILL_OMNI MobileNumber 982001234",
  "errorMessage": "Timeout 30000ms waiting for selector [data-omni-key=\"MobileNumber\"] input",
  "domSnapshot": "<html>...</html>"
}
```

---

## OmniScript Step DSL

| Command | Action |
|---------|--------|
| `FILL_OMNI <field> <val>` | Resilient fill piercing Shadow DOM (LWC, `data-omni-key`, label, name) |
| `SELECT_OMNI <field> <opt>` | Selects option in lightning-combobox or native `<select>` |
| `CHECK_OMNI <field> <true\|false>` | Sets checkbox state with event dispatch |
| `CLICK_NEXT` / `CLICK_SUBMIT` | Waits for `.slds-spinner` and clicks the brand navigation button |
| `ASSERT_OMNI_ERROR <field>` | Asserts inline error badge (`.slds-has-error`, `[role="alert"]`) |
| `ASSERT_CONFIRMATION` | Verifies `ReferenceNumber` or confirmation output |

---

## Running the Servers

### Backend
```bash
cd backend
npm install
node server.js    # runs on http://localhost:4000
```

### Frontend
```bash
cd frontend
npm install
npm run dev       # runs on http://localhost:5173
```

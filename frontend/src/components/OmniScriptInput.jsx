import { useState, useEffect } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

function getLiveBaseUrl(org) {
  if (org && org.uiInstanceUrl) return String(org.uiInstanceUrl).trim().replace(/\/$/, '')
  if (org && org.instanceUrl) {
    let url = String(org.instanceUrl).trim().replace(/\/$/, '')
    if (url.includes('.my.salesforce.com')) {
      return url.replace('.my.salesforce.com', '.lightning.force.com')
    }
    return url
  }
  return ''
}

const PRESET_HYBRID_CPQ = `Hybrid End-to-End Salesforce Lead-to-Cash & CPQ Flow:
1. Prerequisite Ingestion (REST API):
   - Create Account with dynamic company name and industry
   - Create Contact with dynamic email and telephone linked to Account
   - Create Opportunity with close date and prospecting stage linked to Account
   - Create CPQ Quote header via REST API linked to Opportunity
2. Playwright UI Configuration (Quote Line Editor):
   - Navigate to Quote record page (/lightning/r/Quote/{{quoteId}}/view)
   - Click "Edit Lines" to open CPQ editor
   - Configure line item Quantity to "5" and Discount to "15%"
   - Click "Save" and assert Quote record saved
3. Downstream Provisioning & Contract Finalization (REST API):
   - Create Order via REST API linked to Account
   - Create Contract via REST API linked to Account`

const PRESET_SALES_CLOUD = `Salesforce Sales Cloud: Account -> Contact -> Opportunity -> Quote -> Order -> Contract flow.
Manage end-to-end B2B sales operations across 6 lifecycle stages:
1. AccountStep:
   - AccountName (Text, required)
   - Industry (Select: Technology, Financial Services, Healthcare, Manufacturing)
   - AnnualRevenue (Number, required, min 10000)
2. ContactStep:
   - FirstName (Text, required)
   - LastName (Text, required)
   - EmailAddress (Email, required, RFC 5322 valid format)
   - MobileNumber (Tel, required, 10 digits)
3. OpportunityStep:
   - OpportunityName (Text, required)
   - StageName (Select: Prospecting, Qualification, Needs Analysis, Proposal, Closed Won)
   - Amount (Number, required, min 1)
   - ExpectedCloseDate (Text, required)
4. QuoteStep:
   - QuoteNumber (Text, required)
   - ExpirationDate (Text, required)
   - DiscountPercent (Number, optional)
5. OrderStep:
   - OrderType (Select: New Customer, Add-On, Renewal)
   - BillingAddress (TextArea, required)
   - TotalAmount (Number, required)
6. ContractStep:
   - ContractTermMonths (Number, required, min 1)
   - TermsAccepted (Checkbox, must be checked before contract execution)`

const PRESET_LEAD_CONVERSION = `Salesforce Lead Lifecycle & Automated B2B Qualification:
1. Lead Ingestion Step:
   - FirstName (Text, required) and LastName (Text, required)
   - Company (Text, required)
   - Email (Email, required, RFC 5322 valid format)
   - Phone (Tel, required, 10 digits)
   - LeadSource (Select: Web, Partner Referral, Trade Show)
   - Rating (Select: Hot, Warm, Cold)
2. Qualification Criteria:
   - Validate AnnualRevenue and Industry
   - Verify B2B qualification threshold
3. Lead Conversion:
   - Execute Lead conversion to Account, Contact, and Opportunity
   - Set ConvertedStatus to 'Closed - Converted'
   - Assert Account, Contact, and Opportunity records created successfully`

const PRESET_CASE_MANAGEMENT = `Service Cloud Support Case Lifecycle & Escalation:
1. Case Intake Step:
   - Subject (Text, required)
   - Description (TextArea, required)
   - Priority (Select: High, Medium, Low)
   - Origin (Select: Web, Phone, Email)
   - ContactEmail (Email, required)
2. SLA & Entitlement Verification:
   - Link Case to Account and Contact
   - Verify SLA response entitlement tier (Gold / Platinum)
3. Case Comments & Escalation:
   - Add Case Comment with troubleshooting resolution details
   - Escalate Status to 'Working' or 'Escalated'
   - Assert Case resolution milestone achieved`

const PRESET_ACCOUNT_360 = `Salesforce Enterprise Account & Contact 360 Onboarding:
1. Corporate Account Step:
   - AccountName (Text, required)
   - Industry (Select: Technology, Financial Services, Healthcare, Retail)
   - BillingStreet (Text, required), BillingCity (Text, required), BillingPostalCode (Text, required)
   - Type (Select: Prospect, Customer - Direct, Channel Partner)
2. Executive & Technical Contacts:
   - Create Primary Executive Contact (FirstName, LastName, Email, Title)
   - Create Technical Administrator Contact linked to Account
3. Verification Step:
   - Assert Account hierarchy and linked Contacts visible in Lightning view`

const PRESET_FIELD_SERVICE = `Salesforce Field Service Lightning Work Order & Scheduling:
1. Work Order Creation:
   - Subject (Text, required)
   - AccountId (Lookup, required)
   - Priority (Select: Critical, High, Medium, Low)
   - Status (Select: New, In Progress, Completed)
2. Service Appointment Scheduling:
   - ScheduledStartTime (DateTime, required)
   - ScheduledEndTime (DateTime, required)
   - DurationInMinutes (Number, required)
3. Dispatch & Mobile Execution:
   - Dispatch Service Appointment to assigned mobile technician
   - Update Work Order status to 'Dispatched'`

const PRESET_RENEWALS = `Salesforce Asset & Subscription Contract Renewal Lifecycle:
1. Contract Lookup & Assessment:
   - Lookup active Contract linked to Account
   - Verify ContractTerm and active subscription line items
2. Renewal Opportunity Generation:
   - Create Renewal Opportunity with Stage 'Prospecting'
   - Set CloseDate to Contract End Date
3. Asset Amendment Step:
   - Add renewed Subscription / Maintenance Line Items
   - Apply standard price uplift (5% annual renewal index)`

const PRESET_PARTNER = `Experience Cloud Partner Onboarding & Deal Registration:
1. Partner Account Ingestion:
   - AccountName (Text, required)
   - IsPartner (Checkbox, true)
   - PartnerTier (Select: Silver, Gold, Platinum)
2. Partner Contact Provisioning:
   - Create Partner Contact with valid business email
   - Assign Partner Community User Profile
3. Deal Registration Step:
   - Submit Deal Registration Lead
   - Validate Partner Deal Approval workflow`

const PRESET_BILLING = `Salesforce Billing & Automated Invoice Generation:
1. Order Activation Step:
   - OrderNumber (Text, required)
   - OrderStatus (Select: Activated)
   - TotalAmount (Number, required, min 100)
2. Invoice Generation:
   - Generate Billing Invoice linked to Order and Account
   - InvoiceDate (Date, required), DueDate (Date, required)
   - InvoiceStatus (Select: Draft, Posted, Paid)
3. Payment Allocation:
   - Process Payment record with PaymentMethod
   - Allocate Payment to Invoice Line Items and mark Balance = 0`

const DEFAULT_STORY = `As a telecom customer or CSR representative,
I want to onboard a new telecom customer using the QualityX_TelecomOnboarding OmniScript,
so that the customer can select a mobile/broadband plan, configure connections, provide billing and payment details, accept terms, and activate service with an instant confirmation reference.

OmniScript Flow & Acceptance Criteria:
1. CustomerDetailsStep:
   - Must capture FirstName (Text, required) and LastName (Text, required)
   - Must capture Email (Email, required, RFC 5322 valid format)
   - Must capture MobileNumber (Tel, required, exactly 10 digits)
   - Must select CustomerType (Select: Individual, Buisness)
2. PlanSelectionStep:
   - Select ServiceType (Select: Mobile, BroadBand, Enterprise)
   - Select TelecomPlan (Select: Basic 4G, Premium 5G, Buisness Unlimited)
   - Select ConnectionType (Select: Prepaid, Postpaid)
   - Enter NumberOfConnections (Number, minimum 1)
3. PaymentDetailsStep:
   - Enter BillingAddress (TextArea, required), BillingCity (Text, required), BillingState (Text, required), BillingCountry (Text, required), BillingPostalCode (Text, required)
   - Select PaymentMethod (Select: UPI, Credit Card, Net Banking, Invoice)
   - Select BillingCycle (Select: Monthly, Quarterly, Annually)
   - Must check TermsAccepted (Checkbox, mandatory before proceeding)
4. ReviewSubmitStep:
   - Review summary of all previous customer, plan, and payment details
   - Must check ConfirmDetails (Checkbox, mandatory before final submission)
   - Trigger IP_CreateTelecomCustomer Integration Procedure upon click
5. ConfirmationStep:
   - Display SuccessHeading, ConfirmationMessage, and unique ReferenceNumber`

function deriveScriptNameFromStory(story) {
  if (!story || typeof story !== 'string') return 'Salesforce_CustomFlow'
  if (/lead-to-cash|cpq|quote\s*line\s*editor|edit\s*lines/i.test(story)) {
    return 'Salesforce_LeadToCash_CPQ'
  }
  if (/lead.*conversion|lead.*qualification|convertlead/i.test(story)) {
    return 'Salesforce_LeadConversion'
  }
  if (/case.*resolution|service\s*cloud|escalation|entitlement/i.test(story)) {
    return 'ServiceCloud_CaseResolution'
  }
  if (/account.*contact\s*360|corporate\s*account/i.test(story)) {
    return 'Salesforce_AccountContact360'
  }
  if (/field\s*service|work\s*order|service\s*appointment/i.test(story)) {
    return 'FieldService_WorkOrderDispatch'
  }
  if (/subscription\s*renewal|contract\s*renewal|asset\s*renewal/i.test(story)) {
    return 'Salesforce_SubscriptionRenewal'
  }
  if (/partner.*onboarding|experience\s*cloud|deal\s*registration/i.test(story)) {
    return 'ExperienceCloud_PartnerOnboarding'
  }
  if (/billing|invoicing|invoice\s*generation|payment\s*allocation/i.test(story)) {
    return 'Salesforce_BillingAndInvoicing'
  }
  if (/sales\s*cloud|opportunity.*quote.*order.*contract/i.test(story)) {
    return 'SalesCloud_OpportunityToContract'
  }
  if (/qualityx_telecomonboarding|telecom\s+plan|telecom\s+customer/i.test(story)) {
    return 'QualityX_TelecomOnboarding'
  }
  if (/e-?commerce|cart|checkout|shipping.*payment/i.test(story)) {
    return 'ECommerce_Checkout'
  }
  return 'Salesforce_CustomFlow'
}

const MOCK_URL_NORMAL = 'http://localhost:4000/mock-omniscript'
const MOCK_URL_UI_CHANGE = 'http://localhost:4000/mock-omniscript?simulateUiChange=true'
const MOCK_URL_DEFECT = 'http://localhost:4000/mock-omniscript?simulateBug=true'
const DEFAULT_URL = ''

export default function OmniScriptInput({
  onSubmitAnalysis,
  onApproveAndDesign,
  onResetAnalysis,
  onNavigateStage,
  hasTestCases,
  hasReport,
  analysisData,
  loading,
  initialOmniScriptName,
  initialSalesforceUrl,
  initialExecutionMode,
  initialUserStory,
  initialTestData,
  connectedOrg: propConnectedOrg,
}) {
  const [connectedOrg, setConnectedOrg] = useState(propConnectedOrg || null)

  const [omniScriptName, setOmniScriptName] = useState(initialOmniScriptName || 'QualityX_TelecomOnboarding')
  const [salesforceUrl, setSalesforceUrl] = useState(() => {
    if (initialSalesforceUrl && !initialSalesforceUrl.includes('kns5-dev-ed')) {
      return initialSalesforceUrl
    }
    return getLiveBaseUrl(propConnectedOrg) || DEFAULT_URL
  })
  const [userStory, setUserStory] = useState(initialUserStory || DEFAULT_STORY)
  const [testData, setTestData] = useState(initialTestData !== undefined ? initialTestData : 'CustomerType: Buisness, ServiceType: BroadBand, TelecomPlan: Premium 5G, ConnectionType: Postpaid, NumberOfConnections: 10, PaymentMethod: Invoice, BillingCycle: Monthly, BillingAddress: 500 Howard Street, BillingCity: San Francisco, BillingPostalCode: 94105')
  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(false)
  const [activePreset, setActivePreset] = useState('hybrid')

  useEffect(() => {
    if (propConnectedOrg) {
      setConnectedOrg(propConnectedOrg)
      const dynamicLive = getLiveBaseUrl(propConnectedOrg)
      if (dynamicLive && (!salesforceUrl || salesforceUrl.includes('kns5-dev-ed'))) {
        setSalesforceUrl(dynamicLive)
      }
      return
    }
    fetch(`${BACKEND_URL}/api/auth/org-status`)
      .then((res) => res.json())
      .then((data) => {
        if (data && (data.connected || data.instanceUrl)) {
          setConnectedOrg(data)
          const dynamicLive = getLiveBaseUrl(data)
          if (dynamicLive && (!salesforceUrl || salesforceUrl.includes('kns5-dev-ed'))) {
            setSalesforceUrl(dynamicLive)
          }
        }
      })
      .catch(() => {})
  }, [propConnectedOrg])

  useEffect(() => {
    if (initialSalesforceUrl && !initialSalesforceUrl.includes('kns5-dev-ed')) {
      setSalesforceUrl(initialSalesforceUrl)
    }
  }, [initialSalesforceUrl])

  // Execution Environment Mode: 'live' | 'mock'
  const [envMode, setEnvMode] = useState(() => {
    if (initialExecutionMode) return initialExecutionMode
    if (initialSalesforceUrl && /localhost|127\.0\.0\.1|mock-omniscript/i.test(initialSalesforceUrl)) {
      return 'mock'
    }
    return 'live'
  })

  // Dynamic Live Base URL computed from connected org or fallback
  const liveBaseUrl = getLiveBaseUrl(connectedOrg)

  const handleEnvModeChange = (newMode) => {
    setEnvMode(newMode)
    const activeLive = getLiveBaseUrl(connectedOrg)
    if (newMode === 'live') {
      if (/localhost|127\.0\.0\.1|mock-omniscript/i.test(salesforceUrl) || !salesforceUrl.trim()) {
        setSalesforceUrl(activeLive)
      }
    } else if (newMode === 'mock') {
      if (/salesforce\.com|force\.com/i.test(salesforceUrl) || !salesforceUrl.trim()) {
        setSalesforceUrl(MOCK_URL_NORMAL)
      }
    }
  }

  const handleUrlChange = (e) => {
    const val = e.target.value
    setSalesforceUrl(val)
    if (/localhost|127\.0\.0\.1|mock-omniscript/i.test(val)) {
      setEnvMode('mock')
    } else if (/salesforce\.com|force\.com/i.test(val)) {
      setEnvMode('live')
    }
  }

  // Determine current active simulation modes for Mock Engine
  const isUiChangeMode = salesforceUrl.includes('simulateUiChange=true')
  const isDefectMode = salesforceUrl.includes('simulateBug=true')
  const isLiveOrg = salesforceUrl.includes('lightning.force.com') || salesforceUrl.includes('salesforce.com')
  const isNormalMock = !isUiChangeMode && !isDefectMode && !isLiveOrg

  const handleStoryChange = (e) => {
    const val = e.target.value
    setUserStory(val)
    setActivePreset(null)
    if (!isNameManuallyEdited) {
      const derived = deriveScriptNameFromStory(val)
      setOmniScriptName(derived)
    }
  }

  const handleNameChange = (e) => {
    setOmniScriptName(e.target.value)
    setIsNameManuallyEdited(true)
  }

  const handlePresetSelect = (presetKey) => {
    setIsNameManuallyEdited(false)
    setActivePreset(presetKey)
    const activeLive = getLiveBaseUrl(connectedOrg)
    const targetUrl = envMode === 'live' ? activeLive : MOCK_URL_NORMAL

    let payload = {}
    if (presetKey === 'telecom') {
      // In Local Mock Mode: populates http://localhost:4000/mock-omniscript
      // In Live SF Org Mode: locks base path dynamically to remote connected teammate's instance URL
      payload = {
        salesforceUrl: envMode === 'live' ? activeLive : MOCK_URL_NORMAL,
        userStory: DEFAULT_STORY,
        omniScriptName: 'QualityX_TelecomOnboarding',
        testData: 'CustomerType: Buisness, ServiceType: BroadBand, TelecomPlan: Premium 5G, ConnectionType: Postpaid, NumberOfConnections: 10, PaymentMethod: Invoice, BillingCycle: Monthly, BillingAddress: 500 Howard Street, BillingCity: San Francisco, BillingPostalCode: 94105',
      }
    } else if (presetKey === 'hybrid') {
      payload = {
        salesforceUrl: targetUrl,
        userStory: PRESET_HYBRID_CPQ,
        omniScriptName: 'Salesforce_LeadToCash_CPQ',
        testData: 'Product: GenWatt Diesel 1000kW, Quantity: 5, Discount: 15%, Stage: Prospecting',
      }
    } else if (presetKey === 'salescloud') {
      payload = {
        salesforceUrl: targetUrl,
        userStory: PRESET_SALES_CLOUD,
        omniScriptName: 'SalesCloud_OpportunityToContract',
        testData: 'Stage: Qualification, Amount: 75000, ContractTermMonths: 24',
      }
    } else if (presetKey === 'leadconversion') {
      payload = {
        salesforceUrl: targetUrl,
        userStory: PRESET_LEAD_CONVERSION,
        omniScriptName: 'Salesforce_LeadConversion',
        testData: 'LeadSource: Web, Rating: Hot, AnnualRevenue: 500000',
      }
    } else if (presetKey === 'casemanagement') {
      payload = {
        salesforceUrl: targetUrl,
        userStory: PRESET_CASE_MANAGEMENT,
        omniScriptName: 'ServiceCloud_CaseResolution',
        testData: 'Priority: High, Origin: Web, Status: Working',
      }
    } else if (presetKey === 'account360') {
      payload = {
        salesforceUrl: targetUrl,
        userStory: PRESET_ACCOUNT_360,
        omniScriptName: 'Salesforce_AccountContact360',
        testData: 'Industry: Technology, Type: Customer - Direct, BillingCity: San Francisco',
      }
    } else if (presetKey === 'fieldservice') {
      payload = {
        salesforceUrl: targetUrl,
        userStory: PRESET_FIELD_SERVICE,
        omniScriptName: 'FieldService_WorkOrderDispatch',
        testData: 'Priority: Critical, Status: New, DurationHours: 4',
      }
    } else if (presetKey === 'renewals') {
      payload = {
        salesforceUrl: targetUrl,
        userStory: PRESET_RENEWALS,
        omniScriptName: 'Salesforce_SubscriptionRenewal',
        testData: 'UpliftPercent: 5, RenewalTermMonths: 12, Stage: Prospecting',
      }
    } else if (presetKey === 'partner') {
      payload = {
        salesforceUrl: targetUrl,
        userStory: PRESET_PARTNER,
        omniScriptName: 'ExperienceCloud_PartnerOnboarding',
        testData: 'PartnerTier: Gold, DealSize: 120000',
      }
    } else if (presetKey === 'billing') {
      payload = {
        salesforceUrl: targetUrl,
        userStory: PRESET_BILLING,
        omniScriptName: 'Salesforce_BillingAndInvoicing',
        testData: 'TotalAmount: 15000, PaymentMethod: Electronic Funds Transfer',
      }
    }

    setSalesforceUrl(payload.salesforceUrl)
    setUserStory(payload.userStory)
    setOmniScriptName(payload.omniScriptName)
    setTestData(payload.testData)
    if (onResetAnalysis) onResetAnalysis({ ...payload, executionMode: envMode })
  }

  const handleAnalyze = (e) => {
    e.preventDefault()
    let currentStory = userStory.trim()
    let currentName = omniScriptName.trim()

    // If story changed away from telecom default, ignore/auto-update QualityX_TelecomOnboarding
    const isTelecomStory = /qualityx_telecomonboarding|telecom\s+plan|telecom\s+customer/i.test(currentStory)
    if (!isTelecomStory && currentName === 'QualityX_TelecomOnboarding') {
      currentName = deriveScriptNameFromStory(currentStory)
      setOmniScriptName(currentName)
    }

    if (!currentName || !salesforceUrl.trim() || !currentStory) return

    onSubmitAnalysis({
      omniScriptName: currentName,
      salesforceUrl: salesforceUrl.trim(),
      executionMode: envMode,
      userStory: currentStory,
      testData: testData.trim(),
    })
  }

  const handleApprove = () => {
    onApproveAndDesign({
      omniScriptName: omniScriptName.trim(),
      salesforceUrl: salesforceUrl.trim(),
      executionMode: envMode,
      requirements: analysisData,
      testData: testData.trim(),
    })
  }

  return (
    <div className="omniscript-input-container">
      {/* ── Form Card ──────────────────────────────────────────────── */}
      <div className="card form-card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div className="agent-badge-pill">
              <span className="dot" /> Agent 01 · Requirement Analyst
            </div>
            <h2>Salesforce OmniScript Business Requirements</h2>
            <p className="card-subtext">
              Enter your OmniScript specification and Salesforce environment URL to extract structured business rules, field validations, and acceptance criteria.
            </p>
          </div>
          {(hasTestCases || hasReport) && onNavigateStage && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {hasTestCases && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onNavigateStage('DESIGN')}
                  title="Jump forward to review or modify test cases and steps"
                  style={{ fontWeight: '700', borderColor: '#FF8300', color: 'var(--text-primary)' }}
                >
                  📝 View Test Steps ➔
                </button>
              )}
              {hasReport && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => onNavigateStage('REPORT')}
                  title="Jump to latest QA execution and healing report"
                  style={{ fontWeight: '700' }}
                >
                  📊 View Report ➔
                </button>
              )}
            </div>
          )}
        </div>

        <form className="omni-form" onSubmit={handleAnalyze}>
          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="omniScriptName">OmniScript Name *</label>
              <input
                id="omniScriptName"
                type="text"
                value={omniScriptName}
                onChange={handleNameChange}
                required
                className="input code-font"
                placeholder="e.g. SalesCloud_OpportunityToContract"
              />
            </div>

            <div className="form-group url-input-form-group">
              <div className="label-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                <label htmlFor="salesforceUrl" style={{ margin: 0, fontWeight: 700 }}>
                  Salesforce OmniScript URL *
                </label>

                {/* ── Execution Environment Mode Toggle Switch (Live SF Org vs Local Mock Engine) ── */}
                <div className="execution-mode-toggle-wrapper">
                  <span className="env-mode-title">Mode:</span>
                  <div className="env-mode-toggle-container" role="radiogroup" aria-label="Execution Environment Mode">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={envMode === 'live'}
                      className={`env-toggle-pill ${envMode === 'live' ? 'active-live' : ''}`}
                      onClick={() => handleEnvModeChange('live')}
                      title="100% Direct Live Salesforce Org (Requires Active Salesforce Web Session / OTP)"
                    >
                      <span className="env-pill-icon">🌐</span>
                      <span className="env-pill-text">Live Salesforce Cloud</span>
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={envMode === 'mock'}
                      className={`env-toggle-pill ${envMode === 'mock' ? 'active-mock' : ''}`}
                      onClick={() => handleEnvModeChange('mock')}
                      title="Enterprise Shift-Left QA: LWC Shadow DOM Simulation + Live Salesforce REST API Data Verification"
                    >
                      <span className="env-pill-icon">⚡</span>
                      <span className="env-pill-text">Shift-Left Component Simulator</span>
                    </button>
                  </div>
                </div>
              </div>

              <input
                id="salesforceUrl"
                type="url"
                value={salesforceUrl}
                onChange={handleUrlChange}
                required
                className="input code-font"
                placeholder={envMode === 'live' ? liveBaseUrl : 'http://localhost:4000/mock-omniscript'}
              />

              {/* ── Mode-Specific Simulation Controls & Banners ──────── */}
              {envMode === 'mock' ? (
                <>
                  <div className="demo-pills-row">
                    <button
                      type="button"
                      className={`demo-pill-btn ${isNormalMock ? 'active-normal' : ''}`}
                      onClick={() => setSalesforceUrl(MOCK_URL_NORMAL)}
                      title="Run baseline mock with zero injected anomalies"
                    >
                      <span>✅ Normal Mode</span>
                    </button>

                    <button
                      type="button"
                      className={`demo-pill-btn ${isUiChangeMode ? 'active-ui' : ''}`}
                      onClick={() => setSalesforceUrl(MOCK_URL_UI_CHANGE)}
                      title="Injects EmailAddress -> PrimaryContactEmail UI drift to demonstrate Agent 04 & 05"
                    >
                      <span>⚡ Simulate UI Change (Test Self-Healing)</span>
                    </button>

                    <button
                      type="button"
                      className={`demo-pill-btn ${isDefectMode ? 'active-defect' : ''}`}
                      onClick={() => setSalesforceUrl(MOCK_URL_DEFECT)}
                      title="Bypasses TermsAccepted validation on Step 3 to demonstrate Agent 06 Defect Analyst"
                    >
                      <span>🐛 Simulate Functional Bug (Test Defect Analyst)</span>
                    </button>
                  </div>

                  {isUiChangeMode && (
                    <div className="simulation-hint-banner ui-change">
                      <span>⚡ <strong>UI Drift Injected:</strong> Step 1 element <code>EmailAddress</code> is renamed to <code>PrimaryContactEmail</code>. Old test selectors will fail, demonstrating <strong>Agent 04 (Root Cause Investigator)</strong> diagnosing locator drift &amp; <strong>Agent 05 (Self-Healing Engine)</strong> generating healed selectors with interactive <em>'Apply Fix &amp; Re-run'</em>.</span>
                    </div>
                  )}

                  {isDefectMode && (
                    <div className="simulation-hint-banner defect">
                      <span>🐛 <strong>Functional Bug Injected:</strong> Step 3 <code>TermsAccepted</code> checkbox validation rule is bypassed. Negative test case will fail, demonstrating <strong>Agent 06 (Defect Analyst)</strong> identifying the business logic defect and producing a Jira-ready defect report with Root Cause Analysis.</span>
                    </div>
                  )}

                  {isNormalMock && (
                    <div className="simulation-hint-banner normal">
                      <span>✅ <strong>Local Mock Engine Mode:</strong> Compliant Salesforce OmniScript environment with all steps, LWC shadow DOM selectors, and validations passing.</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="simulation-hint-banner live">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
                    <span>
                      🌐 <strong>Live SF Org Mode Active:</strong> Target locked to <code>{salesforceUrl}</code>{connectedOrg?.username ? ` (Active: ${connectedOrg.username})` : ''}. Playwright will bypass all mock endpoints and authenticate directly via Salesforce Frontdoor session tokens.
                    </span>
                    {salesforceUrl !== liveBaseUrl && (
                      <button
                        type="button"
                        className="demo-pill-btn active-live"
                        onClick={() => setSalesforceUrl(liveBaseUrl)}
                        title="Reset URL to default connected org base URL"
                        style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                      >
                        Reset to Org Base
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <div className="label-row">
              <label htmlFor="userStory">Business Requirement / User Story (OmniScript Spec)</label>
              <div className="preset-buttons-group">
                <span className="preset-label">10 Enterprise Journeys:</span>
                <button
                  type="button"
                  className={`preset-btn ${activePreset === 'hybrid' ? 'active' : ''}`}
                  onClick={() => handlePresetSelect('hybrid')}
                  title="Lead-to-Cash CPQ: Account -> Contact -> Opp -> Quote -> Edit Lines UI -> Order & Contract API"
                >
                  ⚡ Lead-to-Cash CPQ (Hybrid)
                </button>
                <button
                  type="button"
                  className={`preset-btn ${activePreset === 'salescloud' ? 'active' : ''}`}
                  onClick={() => handlePresetSelect('salescloud')}
                  title="Sales Cloud 6-Step: Account -> Contact -> Opportunity -> Quote -> Order -> Contract"
                >
                  💼 Sales Cloud (6-Step)
                </button>
                <button
                  type="button"
                  className={`preset-btn ${activePreset === 'leadconversion' ? 'active' : ''}`}
                  onClick={() => handlePresetSelect('leadconversion')}
                  title="Lead Qualification & Conversion: Lead Ingestion -> B2B Rules -> Convert to Account, Contact, Opp"
                >
                  🎯 Lead Qualification &amp; Conversion
                </button>
                <button
                  type="button"
                  className={`preset-btn ${activePreset === 'casemanagement' ? 'active' : ''}`}
                  onClick={() => handlePresetSelect('casemanagement')}
                  title="Case Resolution & Escalation: Ingest Case -> SLA Entitlement -> Priority Escalation"
                >
                  🛠️ Case Resolution &amp; Escalation
                </button>
                <button
                  type="button"
                  className={`preset-btn ${activePreset === 'account360' ? 'active' : ''}`}
                  onClick={() => handlePresetSelect('account360')}
                  title="Account & Contact 360: Corporate Hierarchy, Multi-Contact Management"
                >
                  🏢 Account &amp; Contact 360
                </button>
                <button
                  type="button"
                  className={`preset-btn ${activePreset === 'fieldservice' ? 'active' : ''}`}
                  onClick={() => handlePresetSelect('fieldservice')}
                  title="Field Service Dispatch: Work Order Creation -> Service Appointment -> Mobile Technician Dispatch"
                >
                  ⚡ Field Service Dispatch
                </button>
                <button
                  type="button"
                  className={`preset-btn ${activePreset === 'renewals' ? 'active' : ''}`}
                  onClick={() => handlePresetSelect('renewals')}
                  title="Subscription & Asset Renewal: Asset Verification -> Contract Renewal -> Uplift Index"
                >
                  🔄 Subscription Renewal
                </button>
                <button
                  type="button"
                  className={`preset-btn ${activePreset === 'partner' ? 'active' : ''}`}
                  onClick={() => handlePresetSelect('partner')}
                  title="Partner Community Onboarding: Partner Account -> User Provisioning -> Deal Registration"
                >
                  🤝 Partner Onboarding
                </button>
                <button
                  type="button"
                  className={`preset-btn ${activePreset === 'billing' ? 'active' : ''}`}
                  onClick={() => handlePresetSelect('billing')}
                  title="Billing & Invoicing: Order Activation -> Invoice Generation -> Payment Allocation"
                >
                  💳 Billing &amp; Invoicing
                </button>
                <button
                  type="button"
                  className={`preset-btn ${activePreset === 'telecom' ? 'active' : ''}`}
                  onClick={() => handlePresetSelect('telecom')}
                  title="Telecom OmniScript: Customer Details -> Plan Selection -> Payment -> Confirmation"
                >
                  📱 Telecom OmniScript
                </button>
              </div>
            </div>
            <textarea
              id="userStory"
              rows={10}
              value={userStory}
              onChange={handleStoryChange}
              className="input textarea code-font"
              placeholder="Paste OmniScript user story, step structure, field requirements, or acceptance criteria..."
            />
          </div>

          {/* ── Test Data & Overrides (Optional) ────────────────────────── */}
          <div className="form-group test-data-group">
            <div className="label-row">
              <label htmlFor="testData">
                Test Data &amp; Overrides <span className="badge-optional">(Optional — JSON or Key-Value)</span>
              </label>
              <div className="preset-buttons-group">
                <span className="preset-label">Quick Presets:</span>
                <button
                  type="button"
                  className="data-override-chip"
                  onClick={() => setTestData('Product: GenWatt Diesel 1000kW, Quantity: 5, Discount: 15%, Stage: Prospecting')}
                  title="Override product to GenWatt Diesel 1000kW with 5 qty, 15% discount"
                >
                  ⚡ GenWatt 1000kW (15% Off)
                </button>
                <button
                  type="button"
                  className="data-override-chip"
                  onClick={() => setTestData('Product: SLA Platinum, Quantity: 2, Discount: 20%')}
                  title="Override product to SLA Platinum with 2 qty, 20% discount"
                >
                  🛡️ SLA Platinum (20% Off)
                </button>
                {testData && (
                  <button
                    type="button"
                    className="data-override-chip clear-chip"
                    onClick={() => setTestData('')}
                    title="Clear test data overrides"
                  >
                    ✕ Clear
                  </button>
                )}
              </div>
            </div>
            <textarea
              id="testData"
              rows={3}
              value={testData}
              onChange={(e) => setTestData(e.target.value)}
              className="input textarea code-font test-data-input"
              placeholder="e.g. Product: GenWatt Diesel 1000kW, Quantity: 5, Discount: 15%, Stage: Prospecting (or JSON { &quot;Product&quot;: &quot;GenWatt Diesel 1000kW&quot;, &quot;Quantity&quot;: 5 })"
            />
            <span className="input-helper-text">
              💡 Injected dynamically into Agent 02 test steps, CPQ line item search/discount, and Agent 03 Faker context. If blank, Quality X auto-generates realistic test data.
            </span>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading || !omniScriptName.trim() || !salesforceUrl.trim()}
            style={{
              background: 'linear-gradient(135deg, #FF8300, #FA8C16)',
              borderColor: '#FF8300',
              color: loading && !analysisData ? '#0F172A' : '#FFFFFF',
              fontWeight: '900',
              opacity: 1,
              boxShadow: '0 4px 16px rgba(255, 131, 0, 0.45)',
            }}
          >
            {loading && !analysisData ? (
              <span style={{ color: '#0F172A', fontWeight: '900', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span className="btn-spinner" style={{ borderTopColor: '#0F172A', borderColor: 'rgba(15, 23, 42, 0.3)' }} />
                <span style={{ color: '#0F172A', fontWeight: '900' }}>Agent 01 is Analyzing Requirements &amp; Schema…</span>
              </span>
            ) : (
              '🧠 Run Agent 01: Analyze Requirements'
            )}
          </button>
        </form>
      </div>

      {/* ── Human Review Gate: Agent 01 Analysis Results ───────────── */}
      {analysisData && (
        <div className="card review-gate-card">
          <div className="gate-header">
            <div className="gate-title-group">
              <span className="gate-icon">🛡️</span>
              <div>
                <span className="gate-badge">Human Review Gate 01</span>
                <h3>Extracted Business Rules &amp; Validations</h3>
              </div>
            </div>
            <button
              className="btn btn-primary btn-lg pulse-btn"
              onClick={handleApprove}
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #FF8300, #FA8C16)',
                borderColor: '#FF8300',
                color: loading ? '#0F172A' : '#FFFFFF',
                fontWeight: '900',
                opacity: 1,
                boxShadow: '0 4px 16px rgba(255, 131, 0, 0.45)',
              }}
            >
              {loading ? (
                <span style={{ color: '#0F172A', fontWeight: '900', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span className="btn-spinner" style={{ borderTopColor: '#0F172A', borderColor: 'rgba(15, 23, 42, 0.3)' }} />
                  <span style={{ color: '#0F172A', fontWeight: '900' }}>Running Agent 02…</span>
                </span>
              ) : (
                '✅ Approve Rules & Run Agent 02 (Test Designer) ➔'
              )}
            </button>
          </div>

          <p className="summary-text">{analysisData.summary}</p>

          {/* Injected Test Data Summary if active */}
          {analysisData.testData && Object.keys(analysisData.testData).length > 0 && (
            <div className="test-data-summary-box">
              <span className="data-box-title">🎯 Injected Test Data Overrides:</span>
              <div className="data-box-chips">
                {Object.entries(analysisData.testData).map(([k, v]) => (
                  <span key={k} className="test-data-pill">
                    <strong>{k}:</strong> {String(v)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="analysis-grid">
            {/* Step Hierarchy */}
            <div className="analysis-block">
              <h4>📑 OmniScript Step Hierarchy &amp; Fields</h4>
              <div className="steps-hierarchy">
                {analysisData.steps?.map((step, idx) => (
                  <div key={idx} className="hierarchy-step">
                    <div className="hierarchy-step-title">
                      <span className="step-num">{idx + 1}</span>
                      <strong>{step.stepName}</strong>
                    </div>
                    <div className="fields-chip-list">
                      {step.fields?.map((f, fi) => (
                        <span key={fi} className={`field-chip ${f.required ? 'required' : ''}`}>
                          {f.name} <small>({f.type}{f.required ? ' *' : ''})</small>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Business Rules & Validations */}
            <div className="analysis-block">
              <h4>⚡ Extracted Business Rules</h4>
              <ul className="bullet-list">
                {analysisData.businessRules?.map((rule, idx) => (
                  <li key={idx} className="rule-item">
                    <span className="rule-bullet">✦</span> {rule}
                  </li>
                ))}
              </ul>

              <h4 style={{ marginTop: '1.25rem' }}>🎯 Acceptance Criteria</h4>
              <ul className="bullet-list">
                {analysisData.acceptanceCriteria?.map((ac, idx) => (
                  <li key={idx} className="rule-item ac-item">
                    <span className="ac-check">✓</span> {ac}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

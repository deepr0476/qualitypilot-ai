const axios = require('axios');

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
   - Display SuccessHeading, ConfirmationMessage, and unique ReferenceNumber`;

async function runFullPipeline() {
  const BASE = 'http://localhost:4000';
  console.log('🚀 Step 1: Invoking Agent 01 (Requirement Analyst)...');
  const analyzeRes = await axios.post(`${BASE}/api/agent/analyze`, {
    userStory: DEFAULT_STORY,
    omniScriptName: 'QualityX_TelecomOnboarding',
    testData: 'CustomerType: Buisness, ServiceType: BroadBand, TelecomPlan: Premium 5G, ConnectionType: Postpaid, NumberOfConnections: 10, PaymentMethod: Invoice, BillingCycle: Monthly',
  });
  console.log('✅ Agent 01 Success! Detected Flow:', analyzeRes.data.flowType, '| Steps:', analyzeRes.data.steps?.length);

  console.log('\n🚀 Step 2: Invoking Agent 02 (Test Designer with Faker)...');
  const designRes = await axios.post(`${BASE}/api/agent/design-tests`, {
    requirements: analyzeRes.data,
    omniScriptName: 'QualityX_TelecomOnboarding',
    testData: 'CustomerType: Buisness, ServiceType: BroadBand, TelecomPlan: Premium 5G, ConnectionType: Postpaid, NumberOfConnections: 10, PaymentMethod: Invoice, BillingCycle: Monthly',
  });
  console.log('✅ Agent 02 Success! Generated Test Cases:', designRes.data.testCases?.length);
  designRes.data.testCases?.forEach(tc => {
    console.log(`   [${tc.id}] ${tc.name} (${tc.executionMode}) - ${tc.steps?.length} steps`);
  });

  console.log('\n🚀 Step 3: Invoking Agent 03 (Universal QA Executor)...');
  const execRes = await axios.post(`${BASE}/api/execute-tests`, {
    salesforceUrl: 'http://localhost:4000/mock-omniscript',
    omniScriptName: 'QualityX_TelecomOnboarding',
    executionMode: 'mock',
    testCases: designRes.data.testCases,
  });

  console.log('\n📊 === FINAL EXECUTION SUMMARY ===');
  console.log('Run ID:', execRes.data.runId);
  console.log('Overall Status:', execRes.data.overallStatus);
  console.log('Passed:', execRes.data.passedCount, '| Failed:', execRes.data.failedCount);
  console.log('Duration:', execRes.data.duration);
  execRes.data.results?.forEach(r => {
    console.log(`   [${r.id}] ${r.name}: ${r.status} (${r.duration || 'N/A'})`);
    if (r.error) console.log(`       ❌ Error: ${r.error}`);
  });
}

runFullPipeline().catch(err => {
  console.error('Pipeline error:', err.response?.data || err.message);
});

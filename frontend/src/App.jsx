import { useState, useEffect } from 'react'
import Header from './components/Header'
import OmniScriptInput from './components/OmniScriptInput'
import TestCasePanel from './components/TestCasePanel'
import RunningScreen from './components/RunningScreen'
import QAReport from './components/QAReport'
import './App.css'

const STAGES = {
  ANALYZE: 'ANALYZE',
  DESIGN: 'DESIGN',
  EXECUTE: 'EXECUTE',
  REPORT: 'REPORT',
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'
const API_BASE = `${BACKEND_URL}/api`

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('qualityx_theme') || 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.body.className = theme === 'light' ? 'light-theme' : 'dark-theme'
    localStorage.setItem('qualityx_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const [currentStage, setCurrentStage] = useState(STAGES.ANALYZE)
  const [omniScriptData, setOmniScriptData] = useState({
    omniScriptName: 'QualityX_TelecomOnboarding',
    salesforceUrl: '',
    executionMode: 'live',
  })
  const [connectedOrg, setConnectedOrg] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/auth/org-status`)
      .then((res) => res.json())
      .then((data) => {
        if (data && (data.connected || data.instanceUrl)) {
          setConnectedOrg(data)
          const liveUrl = data.uiInstanceUrl || (data.instanceUrl ? data.instanceUrl.replace('.my.salesforce.com', '.lightning.force.com') : '')
          if (liveUrl) {
            setOmniScriptData((prev) => ({
              ...prev,
              salesforceUrl: (!prev.salesforceUrl || prev.salesforceUrl.includes('kns5-dev-ed')) ? liveUrl : prev.salesforceUrl,
            }))
          }
        }
      })
      .catch(() => {})
  }, [])

  const [testData, setTestData] = useState('')
  const [analysisData, setAnalysisData] = useState(null)
  const [testCases, setTestCases] = useState([])
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [reRunningId, setReRunningId] = useState(null)
  const [error, setError] = useState(null)

  // ── 1. AGENT 01: Analyze Requirements ──────────────────────────────────────
  const handleAnalyze = async ({ omniScriptName, salesforceUrl, executionMode = 'live', userStory, testData: customTestData }) => {
    setLoading(true)
    setError(null)
    setAnalysisData(null)
    setTestCases([])
    setReport(null)
    setCurrentStage(STAGES.ANALYZE)
    const activeTestData = customTestData !== undefined ? customTestData : testData
    setTestData(activeTestData)
    setOmniScriptData({ omniScriptName, salesforceUrl, executionMode, userStory, testData: activeTestData })

    try {
      const ticketId = (omniScriptName || 'Salesforce').replace(/[^A-Za-z0-9]/g, '_').slice(0, 24);
      const res = await fetch(`${API_BASE}/agent/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          omniScriptName,
          salesforceUrl,
          userStory,
          testData: activeTestData,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to analyze requirements')
      }

      const data = await res.json()
      setAnalysisData(data)
      if (data.omniScriptName) {
        setOmniScriptData((prev) => ({ ...prev, omniScriptName: data.omniScriptName }))
      }
    } catch (err) {
      setError(`Agent 01 Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // ── 2. AGENT 02: Design Test Cases ─────────────────────────────────────────
  const handleApproveAndDesign = async ({ omniScriptName, salesforceUrl, executionMode = 'live', requirements, testData: customTestData }) => {
    setLoading(true)
    setError(null)
    const activeTestData = customTestData !== undefined ? customTestData : testData
    setTestData(activeTestData)
    setOmniScriptData((prev) => ({ ...prev, omniScriptName, salesforceUrl, executionMode, testData: activeTestData }))

    try {
      const ticketId = (omniScriptName || 'Salesforce').replace(/[^A-Za-z0-9]/g, '_').slice(0, 24);
      const res = await fetch(`${API_BASE}/agent/design-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          omniScriptName,
          requirements,
          testData: activeTestData,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to generate test cases')
      }

      const data = await res.json()
      const formattedCases = (data.testCases || []).map((tc) => ({
        ...tc,
        approved: true, // Approved by default for review
      }))

      setTestCases(formattedCases)
      if (data.flowType || data.flowTypeLabel) {
        setOmniScriptData((prev) => ({
          ...prev,
          flowType: data.flowType || prev?.flowType,
          flowTypeLabel: data.flowTypeLabel || prev?.flowTypeLabel,
        }))
      }
      setCurrentStage(STAGES.DESIGN)
    } catch (err) {
      setError(`Agent 02 Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // ── 3. AGENT 03: Execute via Playwright ─────────────────────────────────────
  const handleApproveAndExecute = async (approvedCases) => {
    setLoading(true)
    setError(null)
    setCurrentStage(STAGES.EXECUTE)

    try {
      const effectiveMode = omniScriptData.executionMode || (omniScriptData.salesforceUrl?.includes('localhost') ? 'mock' : 'live')
      const res = await fetch(`${API_BASE}/execute-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: 'QualityX_Run',
          salesforceUrl: omniScriptData.salesforceUrl,
          executionMode: effectiveMode,
          testCases: approvedCases,
          healOnFailure: true,
          testData,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Playwright test execution failed')
      }

      const reportData = await res.json()
      setReport(reportData)
      setCurrentStage(STAGES.REPORT)
    } catch (err) {
      setError(`Agent 03 Execution Error: ${err.message}`)
      setCurrentStage(STAGES.DESIGN)
    } finally {
      setLoading(false)
    }
  }

  // ── 4. Apply Self-Healing Fix & Re-run ─────────────────────────────────────
  const handleApplyFixAndRerun = async (tcId, healedStep) => {
    setReRunningId(tcId)
    setError(null)

    // Find and update the test case with the healed step
    const targetCase = testCases.find((tc) => tc.id === tcId)
    if (!targetCase) {
      setReRunningId(null)
      return
    }

    const failedResult = report?.results?.find((r) => r.id === tcId)
    const oldStep = failedResult?.failedStep
    const oldElementName = oldStep ? (oldStep.split(/\s+/)[1] || '') : ''
    const newElementName = healedStep ? (healedStep.split(/\s+/)[1] || '') : ''

    // Replace the failed step / renamed element in the test case
    const updatedSteps = (targetCase.steps || []).map((s) => {
      if (oldStep && s === oldStep) return healedStep
      if (oldElementName && newElementName && s.includes(oldElementName)) {
        return s.replace(new RegExp(`\\b${oldElementName}\\b`, 'g'), newElementName)
      }
      return s
    })

    const updatedCase = {
      ...targetCase,
      steps: updatedSteps,
    }

    // Update testCases state so it stays consistent
    setTestCases((prev) =>
      prev.map((tc) => (tc.id === tcId ? updatedCase : tc))
    )

    try {
      const effectiveMode = omniScriptData.executionMode || (omniScriptData.salesforceUrl?.includes('localhost') ? 'mock' : 'live')
      const res = await fetch(`${API_BASE}/execute-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: `Healed_${tcId}`,
          salesforceUrl: omniScriptData.salesforceUrl,
          executionMode: effectiveMode,
          testCases: [updatedCase],
          healOnFailure: true,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Re-run failed')
      }

      const reRunReport = await res.json()
      const newResult = reRunReport.results?.[0]

      if (newResult && report) {
        // Merge re-run result into existing report
        const updatedResults = report.results.map((r) =>
          r.id === tcId ? newResult : r
        )
        const passed = updatedResults.filter((r) => r.status === 'PASS').length
        const failed = updatedResults.filter((r) => r.status === 'FAIL').length
        const passRate = Math.round((passed / updatedResults.length) * 100)

        setReport({
          ...report,
          summary: {
            total: updatedResults.length,
            passed,
            failed,
            passRate,
          },
          results: updatedResults,
        })
      }
    } catch (err) {
      setError(`Self-Healing Re-run Error: ${err.message}`)
    } finally {
      setReRunningId(null)
    }
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setCurrentStage(STAGES.ANALYZE)
    setAnalysisData(null)
    setTestCases([])
    setReport(null)
    setError(null)
    const liveUrl = connectedOrg?.uiInstanceUrl || (connectedOrg?.instanceUrl ? connectedOrg.instanceUrl.replace('.my.salesforce.com', '.lightning.force.com') : '')
    setOmniScriptData({
      omniScriptName: 'QualityX_TelecomOnboarding',
      salesforceUrl: liveUrl,
      executionMode: 'live',
    })
  }

  const handleResetAnalysis = (presetPayload = {}) => {
    setAnalysisData(null)
    setTestCases([])
    setReport(null)
    setError(null)
    if (presetPayload.testData !== undefined) {
      setTestData(presetPayload.testData)
    }
    if (presetPayload.omniScriptName) {
      setOmniScriptData((prev) => ({
        ...prev,
        ...presetPayload,
      }))
    }
  }

  return (
    <div className="app">
      <Header
        currentStage={currentStage}
        onReset={handleReset}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOrgConnected={(org) => setConnectedOrg(org)}
        onNavigateStage={(stage) => setCurrentStage(stage)}
      />

      <main className="main-content">
        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} title="Dismiss">✕</button>
          </div>
        )}

        {/* ── STAGE 1: Agent 01 Requirement Analyst ────────── */}
        {currentStage === STAGES.ANALYZE && (
          <OmniScriptInput
            onSubmitAnalysis={handleAnalyze}
            onApproveAndDesign={handleApproveAndDesign}
            onResetAnalysis={handleResetAnalysis}
            onNavigateStage={(stage) => setCurrentStage(stage)}
            hasTestCases={testCases.length > 0}
            hasReport={Boolean(report)}
            analysisData={analysisData}
            loading={loading}
            initialOmniScriptName={omniScriptData.omniScriptName}
            initialSalesforceUrl={omniScriptData.salesforceUrl}
            initialExecutionMode={omniScriptData.executionMode}
            initialUserStory={omniScriptData.userStory}
            initialTestData={testData}
            connectedOrg={connectedOrg}
          />
        )}

        {/* ── STAGE 2: Agent 02 Test Designer ──────────────── */}
        {currentStage === STAGES.DESIGN && (
          <TestCasePanel
            omniScriptData={omniScriptData}
            testCases={testCases}
            setTestCases={setTestCases}
            onApproveAndExecute={handleApproveAndExecute}
            onBack={() => setCurrentStage(STAGES.ANALYZE)}
            onViewReport={() => setCurrentStage(STAGES.REPORT)}
            hasReport={Boolean(report)}
            loading={loading}
            testData={testData}
          />
        )}

        {/* ── STAGE 3: Agent 03 QA Executor ────────────────── */}
        {currentStage === STAGES.EXECUTE && (
          <RunningScreen
            omniScriptData={omniScriptData}
            activeCasesCount={testCases.filter((tc) => tc.approved).length}
          />
        )}

        {/* ── STAGE 4: Agents 04-06 Report & Healing ───────── */}
        {currentStage === STAGES.REPORT && (
          <QAReport
            report={report}
            testCases={testCases}
            omniScriptData={omniScriptData}
            onReset={handleReset}
            onNavigateStage={(stage) => setCurrentStage(stage)}
            onApplyFixAndRerun={handleApplyFixAndRerun}
            reRunningId={reRunningId}
            testData={testData}
          />
        )}
      </main>
    </div>
  )
}

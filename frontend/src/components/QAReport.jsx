import { useState } from 'react'
import { downloadPlaywrightSpecFile } from '../utils/playwrightExporter'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

export default function QAReport({
  report,
  testCases = [],
  omniScriptData = {},
  onReset,
  onNavigateStage,
  onApplyFixAndRerun,
  reRunningId,
  testData,
}) {
  const [selectedScreenshot, setSelectedScreenshot] = useState(null)
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'failed' | 'passed'
  const [clearingEvidence, setClearingEvidence] = useState(false)
  const [evidenceCleared, setEvidenceCleared] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [showInitialInputs, setShowInitialInputs] = useState(false)

  if (!report) return null

  const { summary, results, ticketId, salesforceUrl, generatedAt, runId, videoUrl } = report
  const passRate = summary?.passRate ?? 0

  const statusColor =
    passRate === 100 ? 'green' : passRate >= 60 ? 'orange' : 'red'

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/reports/export-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...report, testData }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to generate PDF report')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `QualityX_Execution_Report_${runId || 'run'}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(`PDF Export Error: ${err.message}`)
    } finally {
      setDownloadingPdf(false)
    }
  }

  const downloadReport = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `QualityX_Report_${runId || 'run'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPlaywrightSpec = () => {
    downloadPlaywrightSpecFile({
      testCases: results || [],
      suiteName: ticketId || runId || 'Salesforce_QA',
      salesforceUrl: salesforceUrl || 'https://kns5-dev-ed.develop.lightning.force.com',
    })
  }

  const handleClearEvidence = async () => {
    if (!window.confirm('Are you sure you want to delete all stored screenshots and evidence runs from disk?')) return
    setClearingEvidence(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/evidence`, { method: 'DELETE' })
      if (res.ok) {
        setEvidenceCleared(true)
        setTimeout(() => setEvidenceCleared(false), 3000)
      }
    } catch (err) {
      console.error('Failed to clear evidence:', err)
    } finally {
      setClearingEvidence(false)
    }
  }

  const filteredResults = (results || []).filter((r) => {
    if (activeTab === 'failed') return r.status === 'FAIL'
    if (activeTab === 'passed') return r.status === 'PASS'
    return true
  })

  const getImageSrc = (screenshotUrl) => {
    if (!screenshotUrl) return ''
    if (screenshotUrl.startsWith('http')) return screenshotUrl
    return `${BACKEND_URL}${screenshotUrl}`
  }

  const getVideoSrc = (vUrl) => {
    if (!vUrl) return ''
    if (vUrl.startsWith('http')) return vUrl
    return `${BACKEND_URL}${vUrl}`
  }

  return (
    <div className="report-container">
      {/* ── Top Header ─────────────────────────────────────────────── */}
      <div className="report-header card">
        <div className="header-left">
          <div className="agent-badge-pill">
            <span className="dot" /> Agents 04, 05 &amp; 06 · Report, Self-Healing &amp; Defect Analyst
          </div>
          <h2>Salesforce QA Execution &amp; Self-Healing Report</h2>
          <p className="card-subtext">
            Run ID: <code className="code-font">{runId}</code> · Generated at {new Date(generatedAt).toLocaleTimeString()}
          </p>
        </div>
        <div className="report-actions">
          {onNavigateStage && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onNavigateStage('DESIGN')}
                title="Go back to Agent 02 to review or modify test cases and steps"
                style={{
                  borderColor: '#4f46e5',
                  color: '#4f46e5',
                  fontWeight: '700',
                  background: 'rgba(79, 70, 229, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                📝 Back to Test Steps
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => onNavigateStage('ANALYZE')}
                title="Go back to Agent 01 to review user story and requirements"
                style={{
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                🧠 Back to Requirements
              </button>
            </>
          )}
          {videoUrl && (
            <button
              type="button"
              className="btn btn-primary pulse-btn video-header-btn"
              onClick={() => {
                setSelectedVideo(getVideoSrc(videoUrl))
                setShowVideoModal(true)
              }}
              title="Watch full Playwright execution video"
            >
              🎥 Watch Execution Video
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleClearEvidence}
            disabled={clearingEvidence}
            title="Delete all stored screenshots and evidence runs from disk"
            style={{ color: evidenceCleared ? '#4ade80' : '#f87171' }}
          >
            {clearingEvidence ? '🗑️ Clearing…' : evidenceCleared ? '✅ Evidence Cleared' : '🗑️ Clear Evidence'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            title="Download multi-page professional PDF execution report with inline screenshots"
            style={{
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              border: 'none',
              color: '#ffffff',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {downloadingPdf ? '⏳ Compiling PDF…' : '📄 Download PDF Report'}
          </button>
          <button className="btn btn-secondary" onClick={downloadReport}>
            ⬇ Export JSON Report
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={exportPlaywrightSpec}
            title="Download standalone Playwright .spec.js test script for CI/CD"
            style={{ borderColor: '#6366f1', color: 'var(--text-primary)' }}
          >
            🎭 Export Playwright .spec.js
          </button>
          <button className="btn btn-ghost" onClick={onReset}>
            🔄 New QA Test Run
          </button>
        </div>
      </div>

      {/* ── Collapsible Card: Review Initial Inputs & Defined Steps ── */}
      <div
        className="card"
        style={{
          marginBottom: '1.25rem',
          border: '1px solid var(--border)',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius)',
          transition: 'all 0.2s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onClick={() => setShowInitialInputs((prev) => !prev)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.3rem' }}>📋</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                Review Initial Inputs &amp; Defined Test Steps
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Target Flow: <strong>{omniScriptData?.omniScriptName || 'Salesforce Flow'}</strong> ·{' '}
                {testCases.length > 0 ? `${testCases.length} Test Cases configured` : 'View requirements and original step definitions'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onNavigateStage && (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  onNavigateStage('DESIGN')
                }}
                style={{ fontSize: '12px', fontWeight: '700', color: '#6366f1' }}
              >
                ✏️ Edit in Designer
              </button>
            )}
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
              {showInitialInputs ? '▲ Hide Steps' : '▼ View Steps & Requirements'}
            </span>
          </div>
        </div>

        {showInitialInputs && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '1rem' }}>
              <div style={{ background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Target Flow / OmniScript:
                </span>
                <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {omniScriptData?.omniScriptName || 'Salesforce Flow'}
                </div>
              </div>
              <div style={{ background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Salesforce URL:
                </span>
                <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '2px', wordBreak: 'break-all' }}>
                  <code style={{ color: '#6366f1' }}>{omniScriptData?.salesforceUrl || salesforceUrl || 'N/A'}</code>
                </div>
              </div>
            </div>

            {omniScriptData?.userStory && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Initial User Story / Prompt:
                </div>
                <div
                  style={{
                    background: 'var(--bg-elevated)',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                    border: '1px solid var(--border)',
                  }}
                >
                  {omniScriptData.userStory}
                </div>
              </div>
            )}

            {testCases.length > 0 ? (
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Defined Test Cases &amp; Automation Steps ({testCases.length}):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {testCases.map((tc, idx) => (
                    <div
                      key={tc.id || idx}
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        padding: '10px 14px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                        <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>
                          <code style={{ marginRight: '6px', color: '#6366f1' }}>{tc.id}</code>
                          {tc.name}
                        </span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: tc.type === 'positive' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: tc.type === 'positive' ? '#16a34a' : '#dc2626',
                            }}
                          >
                            {tc.type === 'positive' ? 'Positive' : 'Negative'}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: 'rgba(99, 102, 241, 0.1)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            {tc.approved ? '✅ Executed' : '⏭ Skipped'}
                          </span>
                        </div>
                      </div>
                      {tc.description && (
                        <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {tc.description}
                        </p>
                      )}
                      <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                        {(tc.steps || []).map((step, sIdx) => (
                          <li key={sIdx} style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '11.5px' }}>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                No active test cases currently in state.
              </div>
            )}
          </div>
        )}
      </div>

      {testData && (
        <div className="test-data-active-strip" style={{ marginBottom: '1.25rem' }}>
          <span className="strip-label">🎯 Injected Test Data &amp; Parameters:</span>
          <code className="strip-value">{testData}</code>
        </div>
      )}

      {/* ── Summary KPI Grid ──────────────────────────────────────── */}
      <div className="summary-grid">
        <div className="summary-card blue">
          <div className="summary-icon">🧪</div>
          <div>
            <div className="summary-value">{summary?.total ?? 0}</div>
            <div className="summary-label">Total Test Cases</div>
          </div>
        </div>

        <div className="summary-card green">
          <div className="summary-icon">✅</div>
          <div>
            <div className="summary-value">{summary?.passed ?? 0}</div>
            <div className="summary-label">Passed Tests</div>
          </div>
        </div>

        <div className="summary-card red">
          <div className="summary-icon">❌</div>
          <div>
            <div className="summary-value">{summary?.failed ?? 0}</div>
            <div className="summary-label">Failed Tests</div>
          </div>
        </div>

        <div className={`summary-card summary-rate ${statusColor}`}>
          <div className="summary-icon">
            {passRate === 100 ? '🏆' : passRate >= 60 ? '⚠️' : '🚨'}
          </div>
          <div style={{ flex: 1 }}>
            <div className="summary-value">{passRate}%</div>
            <div className="summary-label">Quality Score / Pass Rate</div>
            <div className="rate-bar-wrap">
              <div className="rate-bar" style={{ width: `${passRate}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Playwright Video Artifact Card ───────────────────────────── */}
      {videoUrl && (
        <div className="card video-artifact-card">
          <div className="video-card-header">
            <div className="video-title-group">
              <span className="video-live-badge">🎥 LIVE RECORDING ARTIFACT</span>
              <h3>Playwright Live Execution Video (.webm)</h3>
              <p className="card-subtext">
                Recorded live on screen with <code>slowMo: 400ms</code>. Shows real-time Lightning navigation, clicks, and record verification.
              </p>
            </div>
            <div className="video-card-actions">
              <a
                href={getVideoSrc(videoUrl)}
                download={`QualityX_${runId}_video.webm`}
                className="btn btn-secondary btn-sm"
              >
                ⬇ Download Video
              </a>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSelectedVideo(getVideoSrc(videoUrl))
                  setShowVideoModal(true)
                }}
              >
                ⤢ Fullscreen Modal
              </button>
            </div>
          </div>
          <div className="video-player-container">
            <video
              controls
              className="embedded-video-player"
              poster={results[0]?.screenshotUrl ? getImageSrc(results[0].screenshotUrl) : undefined}
            >
              <source src={getVideoSrc(videoUrl)} type="video/webm" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}

      {/* ── Filter Tabs ────────────────────────────────────────────── */}
      <div className="filter-bar">
        <div className="tabs-group">
          <button
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Results ({results?.length || 0})
          </button>
          <button
            className={`tab-btn tab-failed ${activeTab === 'failed' ? 'active' : ''}`}
            onClick={() => setActiveTab('failed')}
          >
            Failed / Anomalies ({summary?.failed || 0})
          </button>
          <button
            className={`tab-btn tab-passed ${activeTab === 'passed' ? 'active' : ''}`}
            onClick={() => setActiveTab('passed')}
          >
            Passed ({summary?.passed || 0})
          </button>
        </div>
      </div>

      {/* ── Detailed Test Results List ─────────────────────────────── */}
      <div className="results-list">
        {filteredResults.map((r) => {
          const healing = r.healingAnalysis
          const isHealing = reRunningId === r.id

          return (
            <div key={r.id} className={`result-card card ${r.status.toLowerCase()}`}>
              <div className="result-top">
                <div className="result-meta">
                  <span className={`status-badge ${r.status.toLowerCase()}`}>
                    {r.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}
                  </span>
                  <span className={`badge badge-${r.type}`}>
                    {r.type === 'positive' ? 'Positive Scenario' : 'Negative Scenario'}
                  </span>
                  {r.executionMode === 'HYBRID_E2E' ? (
                    <span className="badge badge-hybrid">⚡🌐 Hybrid API + UI</span>
                  ) : r.executionMode === 'API_TEST' ? (
                    <span className="badge badge-api">🌐 REST API / IP</span>
                  ) : r.executionMode === 'LIGHTNING_UI' ? (
                    <span className="badge badge-lightning">⚡ Lightning UI</span>
                  ) : (
                    <span className="badge badge-omni">📱 OmniScript UI</span>
                  )}
                  <span className="step-target-badge">
                    📍 {r.targetStep || 'OmniScript'}
                  </span>
                  <span className="result-id">{r.id}</span>
                </div>

                {r.finishedAt && r.startedAt && (
                  <span className="duration muted">
                    ⏱ {Math.max(1, Math.round((new Date(r.finishedAt) - new Date(r.startedAt)) / 1000))}s
                  </span>
                )}
              </div>

              <h3 className="result-title">{r.name || r.description}</h3>
              <p className="result-description">{r.description}</p>

              {/* Error message */}
              {r.error && (
                <div className="error-block">
                  <strong>⚠️ Execution Failure:</strong> {r.error}
                  {r.failedStep && (
                    <div style={{ marginTop: '0.35rem' }}>
                      <strong>Failed Step:</strong> <code>{r.failedStep}</code>
                    </div>
                  )}
                </div>
              )}

              {/* REST API Transaction Logs for API / Hybrid executions */}
              {r.apiLogs && r.apiLogs.length > 0 && (
                <div className="api-logs-section">
                  <div className="api-logs-header">
                    <strong>🌐 REST API / IP Transactions ({r.apiLogs.length})</strong>
                  </div>
                  <div className="api-logs-list">
                    {r.apiLogs.map((log, li) => (
                      <div key={li} className="api-log-item">
                        <div className="api-log-top">
                          <span className="api-method-pill">{log.method}</span>
                          <span className="api-url-text">{log.url}</span>
                          <span className={`api-status-pill ${log.actualStatus < 300 ? 'status-ok' : 'status-err'}`}>
                            HTTP {log.actualStatus}
                          </span>
                          <span className="api-duration-text">⏱ {log.durationMs}ms</span>
                        </div>
                        {log.requestBody && (
                          <details className="api-payload-box">
                            <summary>Request Payload: {typeof log.requestBody === 'object' ? JSON.stringify(log.requestBody).slice(0, 60) + '...' : String(log.requestBody).slice(0, 60)}</summary>
                            <pre>{JSON.stringify(log.requestBody, null, 2)}</pre>
                          </details>
                        )}
                        <details className="api-payload-box">
                          <summary>Response Body</summary>
                          <pre>{log.responseSnippet}</pre>
                        </details>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence Screenshot & Video Link */}
              {r.screenshotUrl && (
                <div className="evidence-section">
                  <div className="evidence-header">
                    <strong>📸 Captured Playwright Evidence:</strong>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {(r.videoUrl || videoUrl) && (
                        <button
                          type="button"
                          className="btn-link"
                          style={{ color: '#818cf8', cursor: 'pointer', background: 'none', border: 'none', font: 'inherit' }}
                          onClick={() => {
                            setSelectedVideo(getVideoSrc(r.videoUrl || videoUrl))
                            setShowVideoModal(true)
                          }}
                        >
                          🎥 Watch Video
                        </button>
                      )}
                      <a
                        href={getImageSrc(r.screenshotUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-link"
                      >
                        Open in new tab ↗
                      </a>
                    </div>
                  </div>
                  <div
                    className="screenshot-preview-container"
                    onClick={() => setSelectedScreenshot(getImageSrc(r.screenshotUrl))}
                  >
                    <img
                      src={getImageSrc(r.screenshotUrl)}
                      alt={`Screenshot evidence for ${r.id}`}
                      className="screenshot-thumb"
                      loading="lazy"
                    />
                    <div className="screenshot-overlay">🔍 Click to Expand</div>
                  </div>
                </div>
              )}

              {/* ── AGENT 04 & 05: Self-Healing Section ─────────────── */}
              {healing && healing.classification === 'LOCATOR_DRIFT' && (
                <div className="healing-card">
                  <div className="healing-badge-row">
                    <span className="agent-tag a04">Agent 04: UI Investigator</span>
                    <span className="agent-tag a05">Agent 05: Self-Healing Reviewer</span>
                    <span className="confidence-pill">
                      {(healing.confidence * 100).toFixed(0)}% Confidence
                    </span>
                  </div>

                  <div className="healing-body">
                    <h4>🩺 UI Drift Detected &amp; Healed Locator Generated</h4>
                    <p className="healing-explanation">
                      {healing.agent04_ui_investigation?.detectedChange}
                    </p>

                    <div className="healed-selectors-box">
                      <strong>Proposed Resilient Locators:</strong>
                      <ul>
                        {healing.agent05_self_healing?.proposedSelectors?.map((ps, pi) => (
                          <li key={pi}>
                            <code>{ps.selector}</code> <span className="selector-type">({ps.type})</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="healing-action-row">
                      <div className="healed-step-info">
                        <strong>Proposed Healed Step:</strong>{' '}
                        <code>{healing.agent05_self_healing?.healedStep || r.failedStep}</code>
                      </div>
                      <button
                        className="btn btn-primary pulse-btn"
                        disabled={isHealing}
                        onClick={() =>
                          onApplyFixAndRerun(
                            r.id,
                            healing.agent05_self_healing?.healedStep || r.failedStep
                          )
                        }
                      >
                        {isHealing ? (
                          <>
                            <span className="btn-spinner" /> Re-running with Fix…
                          </>
                        ) : (
                          '✨ Apply Fix & Re-run'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── AGENT 06: Defect Analyst Section ────────────────── */}
              {healing && healing.classification === 'DEFECT' && (
                <div className="defect-card">
                  <div className="defect-header">
                    <div className="defect-badge-group">
                      <span className="agent-tag a06">Agent 06: Defect Analyst</span>
                      <span className={`severity-badge ${healing.agent06_defect_report?.severity?.toLowerCase()}`}>
                        Severity: {healing.agent06_defect_report?.severity || 'High'}
                      </span>
                    </div>
                    <span className="component-tag">
                      {healing.agent06_defect_report?.component || 'Salesforce OmniScript'}
                    </span>
                  </div>

                  <div className="defect-body">
                    <h4>🐛 Defect Bug Report: {healing.agent06_defect_report?.title}</h4>
                    <p className="defect-rca">
                      <strong>Root Cause:</strong> {healing.agent06_defect_report?.rootCauseAnalysis}
                    </p>

                    <div className="defect-details-grid">
                      <div>
                        <strong>Expected Behavior:</strong>
                        <p>{healing.agent06_defect_report?.expectedBehavior}</p>
                      </div>
                      <div>
                        <strong>Actual Behavior:</strong>
                        <p>{healing.agent06_defect_report?.actualBehavior}</p>
                      </div>
                    </div>

                    {healing.agent06_defect_report?.suggestedRemediation && (
                      <div className="remediation-box">
                        <strong>🛠️ Recommended Remediation:</strong>{' '}
                        {healing.agent06_defect_report.suggestedRemediation}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step Logs Accordion */}
              {r.stepLogs && r.stepLogs.length > 0 && (
                <details className="step-logs-details">
                  <summary>📜 View Execution Logs ({r.stepLogs.length} events)</summary>
                  <ul className="step-logs-list">
                    {r.stepLogs.map((log, li) => (
                      <li key={li}><code>{log}</code></li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Lightbox Modal for Screenshots ─────────────────────────── */}
      {selectedScreenshot && (
        <div className="lightbox-backdrop" onClick={() => setSelectedScreenshot(null)}>
          <div className="lightbox-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-top">
              <strong>Playwright Screenshot Evidence</strong>
              <button
                className="btn-icon-close"
                onClick={() => setSelectedScreenshot(null)}
              >
                ✕
              </button>
            </div>
            <img src={selectedScreenshot} alt="Full evidence view" className="lightbox-img" />
          </div>
        </div>
      )}

      {/* ── Lightbox Modal for Video Recording ──────────────────────── */}
      {showVideoModal && selectedVideo && (
        <div className="lightbox-backdrop" onClick={() => setShowVideoModal(false)}>
          <div className="lightbox-modal video-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-top">
              <strong>🎥 Playwright Live Execution Recording</strong>
              <button
                className="btn-icon-close"
                onClick={() => setShowVideoModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-video-wrapper">
              <video
                controls
                autoPlay
                className="modal-video-player"
              >
                <source src={selectedVideo} type="video/webm" />
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="modal-video-footer">
              <a
                href={selectedVideo}
                download={`QualityX_${runId}_video.webm`}
                className="btn btn-secondary btn-sm"
              >
                ⬇ Download WebM Video
              </a>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowVideoModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

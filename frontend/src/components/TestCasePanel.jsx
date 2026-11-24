import { useState } from 'react'
import { downloadPlaywrightSpecFile } from '../utils/playwrightExporter'
import AgentSwarmMatrix from './AgentSwarmMatrix'
import CodeXSelfHealingPanel from './CodeXSelfHealingPanel'

export default function TestCasePanel({
  omniScriptData,
  testCases,
  setTestCases,
  onApproveAndExecute,
  onBack,
  onViewReport,
  hasReport,
  loading,
  testData,
}) {
  const [editingId, setEditingId] = useState(null)
  const [newStep, setNewStep] = useState('')

  const handleExportSpec = () => {
    downloadPlaywrightSpecFile({
      testCases: testCases.filter((tc) => tc.approved),
      suiteName: omniScriptData?.omniScriptName || 'Salesforce_QA',
      salesforceUrl: omniScriptData?.salesforceUrl || 'https://kns5-dev-ed.develop.lightning.force.com',
    })
  }

  const toggleApproval = (id) => {
    setTestCases((prev) =>
      prev.map((tc) => (tc.id === id ? { ...tc, approved: !tc.approved } : tc))
    )
  }

  const selectOnlyPositive = () => {
    setTestCases((prev) =>
      prev.map((tc) => ({ ...tc, approved: tc.type === 'positive' }))
    )
  }

  const selectAll = () => {
    setTestCases((prev) => prev.map((tc) => ({ ...tc, approved: true })))
  }

  const deselectAll = () => {
    setTestCases((prev) => prev.map((tc) => ({ ...tc, approved: false })))
  }

  const selectOnlyNegative = () => {
    setTestCases((prev) =>
      prev.map((tc) => ({ ...tc, approved: tc.type === 'negative' }))
    )
  }

  const addStep = (tcId) => {
    if (!newStep.trim()) return
    setTestCases((prev) =>
      prev.map((tc) =>
        tc.id === tcId ? { ...tc, steps: [...(tc.steps || []), newStep.trim()] } : tc
      )
    )
    setNewStep('')
  }

  const removeStep = (tcId, stepIdx) => {
    setTestCases((prev) =>
      prev.map((tc) =>
        tc.id === tcId ? { ...tc, steps: tc.steps.filter((_, i) => i !== stepIdx) } : tc
      )
    )
  }

  const approvedCount = testCases.filter((tc) => tc.approved).length

  // Exclusively ship checked test cases to the backend runner
  const handleRun = () => {
    const approved = testCases.filter((tc) => tc.approved)
    if (approved.length === 0) return
    onApproveAndExecute(approved)
  }

  return (
    <div className="test-case-panel">
      {/* ── 6-Agent Executive Swarm Matrix ── */}
      <AgentSwarmMatrix currentStage={loading ? 'RUN' : 'DESIGN'} loading={loading} />

      {/* ── Review Gate Header ─────────────────────────────────────── */}
      <div className="panel-header card review-gate-card">
        <div className="gate-title-group">
          <span className="gate-icon">📝</span>
          <div>
            <div className="agent-badge-pill">
              <span className="dot" /> Agent 02 · Test Designer
            </div>
            <h2>Review &amp; Approve Multi-Layer Test Cases</h2>
            <p className="card-subtext">
              Target Flow: <strong>{omniScriptData?.omniScriptName || 'Salesforce Flow'}</strong> ·{' '}
              <span className="badge-flow-type">{omniScriptData?.flowTypeLabel || 'Salesforce'}</span> ·{' '}
              <span className="highlight-text">{approvedCount} of {testCases.length} Test Cases Selected</span>
            </p>
          </div>
        </div>

        <div className="panel-actions">
          <button className="btn btn-ghost" onClick={onBack} disabled={loading}>
            ← Back to Requirements
          </button>
          {hasReport && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onViewReport}
              title="Return to the latest QA Execution & Self-Healing Report"
              style={{
                borderColor: '#FF8300',
                color: '#FF8300',
                fontWeight: '700',
                background: 'rgba(255, 131, 0, 0.08)',
              }}
            >
              📊 View Latest Report ➔
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportSpec}
            disabled={approvedCount === 0}
            title="Download standalone Playwright .spec.js test script for CI/CD"
          >
            🎭 Export Playwright .spec.js
          </button>
          <button
            className="btn btn-primary btn-lg pulse-btn"
            onClick={handleRun}
            disabled={loading || approvedCount === 0}
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
                <span style={{ color: '#0F172A', fontWeight: '900' }}>Executing Selected Tests…</span>
              </span>
            ) : (
              `⚡ Execute Selected Tests (${approvedCount}) ➔`
            )}
          </button>
        </div>
      </div>

      {/* ── Selective Execution Checkbox Toolbar ────────────────────── */}
      <div className="tc-selection-bar" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>Selective Execution:</span>
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={selectOnlyPositive}
          title="Uncheck all negative paths and run only the single Positive Happy Path"
          style={{ fontWeight: '700' }}
        >
          ✅ Only Positive Happy Path
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={selectAll}
          title="Select all test cases"
        >
          ☑️ Select All ({testCases.length})
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={deselectAll}
          title="Deselect all test cases"
        >
          ⏹️ Deselect All
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={selectOnlyNegative}
          title="Select only negative test cases"
        >
          ❌ Only Negative Tests
        </button>
      </div>

      {/* ── Active Test Data Override Banner (if any) ──────────────── */}
      {testData && (
        <div className="test-data-active-strip">
          <span className="strip-label">🎯 Active Injected Test Data:</span>
          <code className="strip-value">{testData}</code>
        </div>
      )}

      {/* ── Test Cases Grid (High-Contrast Slate-100 Container in Light Mode) ── */}
      <div className="tc-grid">
        {testCases.map((tc) => (
          <div
            key={tc.id}
            className={`tc-card ${tc.approved ? 'approved' : 'skipped'} ${tc.type}`}
          >
            <div className="tc-card-top">
              <div className="tc-meta">
                <span className={`badge badge-${tc.type}`}>
                  {tc.type === 'positive' ? '✅ Positive Happy Path' : '❌ Negative Validation'}
                </span>
                {tc.executionMode === 'HYBRID_E2E' ? (
                  <span className="badge badge-hybrid">⚡🌐 Hybrid API + UI</span>
                ) : tc.executionMode === 'API_TEST' ? (
                  <span className="badge badge-api">🌐 REST API / IP</span>
                ) : tc.executionMode === 'LIGHTNING_UI' ? (
                  <span className="badge badge-lightning">⚡ Lightning UI</span>
                ) : (
                  <span className="badge badge-omni">📱 OmniScript UI</span>
                )}
                <span className="step-target-badge">
                  📍 {tc.targetStep || 'OmniScript'}
                </span>
                <span className="tc-id">{tc.id}</span>
              </div>

              {/* Native Checkbox Input Next to Each Scenario */}
              <label
                className="tc-card-checkbox-label"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  background: tc.approved ? 'rgba(255, 131, 0, 0.15)' : 'var(--bg-elevated)',
                  border: `1px solid ${tc.approved ? '#FF8300' : 'var(--border)'}`,
                  padding: '5px 12px',
                  borderRadius: '20px',
                  transition: 'all 0.2s ease',
                }}
              >
                <input
                  type="checkbox"
                  className="tc-select-checkbox"
                  checked={tc.approved}
                  onChange={() => toggleApproval(tc.id)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#FF8300' }}
                />
                <span style={{ fontWeight: '800', fontSize: '12px', color: tc.approved ? '#FF8300' : 'var(--text-muted)' }}>
                  {tc.approved ? 'Selected' : 'Skipped'}
                </span>
              </label>
            </div>

            <h3 className="tc-name">{tc.name || tc.description}</h3>
            <p className="tc-description">{tc.description}</p>

            <div className="tc-steps">
              <div className="steps-header">
                <strong>Executable Action Steps ({tc.steps?.length || 0})</strong>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setEditingId(editingId === tc.id ? null : tc.id)}
                >
                  {editingId === tc.id ? 'Done Editing' : '✏️ Edit Steps'}
                </button>
              </div>
              <ol className="steps-list">
                {tc.steps?.map((step, i) => {
                  const s = (step || '').trim();
                  const isApi = s.startsWith('API_REQUEST');
                  const isUi = /^(NAVIGATE|CLICK|FILL|SELECT|SEARCH|CHECK|WAIT|CAPTURE|SCREENSHOT)/i.test(s);
                  const isAssert = s.startsWith('ASSERT');
                  const isSkill = s.startsWith('SKILL');

                  return (
                    <li key={i} className="step-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isApi ? (
                        <span className="step-badge step-badge-api" title="REST API Step">API</span>
                      ) : isUi ? (
                        <span className="step-badge step-badge-ui" title="Physical Playwright Headed UI Step">UI</span>
                      ) : isAssert ? (
                        <span className="step-badge step-badge-assert" title="Assertion Step">ASSERT</span>
                      ) : isSkill ? (
                        <span className="step-badge step-badge-skill" title="Salesforce Skill Step">SKILL</span>
                      ) : (
                        <span className="step-badge step-badge-generic">STEP</span>
                      )}
                      <code style={{ flex: 1 }}>{step}</code>
                      {editingId === tc.id && (
                        <button
                          type="button"
                          className="step-remove"
                          title="Remove step"
                          onClick={() => removeStep(tc.id, i)}
                        >
                          ✕
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>

              {editingId === tc.id && (
                <div className="add-step">
                  <input
                    type="text"
                    placeholder="e.g. FILL_OMNI FirstName John or CLICK_NEXT"
                    value={newStep}
                    onChange={(e) => setNewStep(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addStep(tc.id)}
                    className="input input-sm code-font"
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => addStep(tc.id)}
                  >
                    + Add Step
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* ── CodeX Automated Self-Healing Monitor ── */}
      <CodeXSelfHealingPanel />
    </div>
  )
}

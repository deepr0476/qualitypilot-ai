import React, { useState, useEffect, useRef } from 'react'

const INITIAL_TELEMETRY = [
  {
    id: 1,
    time: '04:12:08',
    type: 'OBSERVER',
    tag: 'INIT',
    msg: 'CodeX Shadow-DOM Mutation Observer initialized across OmniStudio LWC boundary.',
    details: 'Target: c-omni-combobox, vlocity_cmt-omni-combobox, lightning-input'
  },
  {
    id: 2,
    time: '04:12:09',
    type: 'SCAN',
    tag: 'TRACE',
    msg: 'Inspecting accessibility tree and ARIA roles for combobox elements.',
    details: 'Resolved role="combobox" on #comboboxId-28 [aria-expanded=false]'
  },
  {
    id: 3,
    time: '04:12:11',
    type: 'ALERT',
    tag: 'ALERT',
    msg: 'Salesforce DOM mutation detected on Element: [CustomerType].',
    details: 'Old locator [name="CustomerType"] shifted behind Shadow Root in Spring 26 LWC runtime.'
  },
  {
    id: 4,
    time: '04:12:12',
    type: 'HEALING',
    tag: 'HEAL',
    msg: 'Launching CodeX structural lookup cascade & piercing Shadow-DOM boundary...',
    details: 'Evaluating 4 candidates: [role="combobox"], [data-omni-key], input.slds-combobox__input, slot > input'
  },
  {
    id: 5,
    time: '04:12:13',
    type: 'ACTION',
    tag: 'SUCCESS',
    msg: 'Successfully self-healed using Shadow-DOM locator: page.locator(\'input[role="combobox"]\'). Clicks verified!',
    details: 'Dispatched Synthetic PointerEvent + CustomEvent("change") with 0ms test interruption.'
  },
  {
    id: 6,
    time: '04:12:14',
    type: 'GROUND',
    tag: 'PERSIST',
    msg: 'Integration Procedure [Create Telecom Customer] trigger verified via Salesforce DB backend.',
    details: 'Linked SObject Telecom_Customer__c record persistence grounded with 100% fidelity.'
  }
]

export default function CodeXSelfHealingPanel({ liveLogs = [], className = '' }) {
  const [logs, setLogs] = useState(INITIAL_TELEMETRY)
  const [filter, setFilter] = useState('ALL')
  const [autoScroll, setAutoScroll] = useState(true)
  const consoleEndRef = useRef(null)

  useEffect(() => {
    if (autoScroll && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  // Handle incoming live logs if provided from execution
  useEffect(() => {
    if (Array.isArray(liveLogs) && liveLogs.length > 0) {
      const now = new Date()
      const timeStr = now.toTimeString().split(' ')[0]
      const formatted = liveLogs.map((logStr, idx) => ({
        id: `live-${Date.now()}-${idx}`,
        time: timeStr,
        type: logStr.includes('mutation') || logStr.includes('Error') ? 'ALERT' :
              logStr.includes('healed') || logStr.includes('Healing') ? 'HEALING' :
              logStr.includes('Verified') || logStr.includes('success') ? 'ACTION' : 'SCAN',
        tag: logStr.includes('healed') ? 'HEAL' : 'LIVE',
        msg: logStr,
        details: 'Live Salesforce OmniStudio Runtime Event'
      }))
      setLogs((prev) => [...prev, ...formatted])
    }
  }, [liveLogs])

  const handleSimulateHeal = () => {
    const now = new Date()
    const timeStr = now.toTimeString().split(' ')[0]
    const newItems = [
      {
        id: Date.now() + 1,
        time: timeStr,
        type: 'ALERT',
        tag: 'MUTATION',
        msg: `Alert: Reactive UI re-render mutated selector on [PaymentMethod: Invoice].`,
        details: 'Native Salesforce LWC invalidated static CSS selector .slds-radio_button'
      },
      {
        id: Date.now() + 2,
        time: timeStr,
        type: 'HEALING',
        tag: 'HEAL',
        msg: `Launching CodeX semantic fallback to role="option" text matching "Invoice"...`,
        details: 'Scanning active document & iframe[src*="omnistudioPreview"] shadow roots'
      },
      {
        id: Date.now() + 3,
        time: timeStr,
        type: 'ACTION',
        tag: 'SUCCESS',
        msg: `Self-healing confirmed: Bound to doc.querySelector('[role="option"]:has-text("Invoice")'). Value committed!`,
        details: 'Zero manual script rewrite needed. High-availability continuous execution preserved.'
      }
    ]
    setLogs((prev) => [...prev, ...newItems])
  }

  const filteredLogs = logs.filter((item) => {
    if (filter === 'ALERTS') return item.type === 'ALERT'
    if (filter === 'HEALING') return item.type === 'HEALING' || item.type === 'ACTION'
    if (filter === 'PERSISTENCE') return item.type === 'GROUND'
    return true
  })

  return (
    <div className={`codex-panel-wrapper ${className}`}>
      <div className="codex-panel-header">
        <div className="codex-header-title">
          <span className="codex-icon">🩺</span>
          <div>
            <div className="codex-badge-row">
              <span className="codex-agent-pill">Agent 04 · Autonomous Engine</span>
              <span className="codex-status-pulse">
                <span className="pulse-dot-green" /> DOM Mutation Observer: ACTIVE
              </span>
              <span className="codex-status-pulse" style={{ borderColor: 'rgba(255, 131, 0, 0.4)', background: 'rgba(255, 131, 0, 0.12)', color: 'var(--keonos-orange, #FF8300)' }}>
                Zero-Touch Recovery: ENGAGED
              </span>
            </div>
            <h3 className="codex-main-title">🩺 CodeX Automated Self-Healing Monitor</h3>
            <p className="codex-sub-title">
              Real-time telemetry stream piercing Salesforce Shadow DOM &amp; dynamic LWC structural mutations.
            </p>
          </div>
        </div>

        <div className="codex-header-actions">
          <div className="codex-filter-pills">
            <button
              type="button"
              className={`codex-pill-btn ${filter === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilter('ALL')}
            >
              All Telemetry ({logs.length})
            </button>
            <button
              type="button"
              className={`codex-pill-btn ${filter === 'HEALING' ? 'active' : ''}`}
              onClick={() => setFilter('HEALING')}
            >
              ⚡ Self-Healing Events
            </button>
            <button
              type="button"
              className={`codex-pill-btn ${filter === 'ALERTS' ? 'active' : ''}`}
              onClick={() => setFilter('ALERTS')}
            >
              ⚠️ Mutation Alerts
            </button>
          </div>

          <button
            type="button"
            className="codex-simulate-btn"
            onClick={handleSimulateHeal}
            title="Simulate a real-time Salesforce DOM mutation event to demonstrate CodeX self-healing"
          >
            ⚡ Simulate DOM Mutation
          </button>
        </div>
      </div>

      <div className="codex-terminal-body">
        <div className="codex-terminal-banner">
          <span className="terminal-dot red" />
          <span className="terminal-dot yellow" />
          <span className="terminal-dot green" />
          <span className="terminal-session-text">
            CODEX-DAEMON-v2.4 // SALESFORCE_LWC_SHADOW_DOM // LIVE_STREAM_CONNECTED
          </span>
          <label className="codex-autoscroll-toggle">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            <span>Auto-Scroll</span>
          </label>
        </div>

        <div className="codex-log-stream">
          {filteredLogs.map((item) => {
            const isAlert = item.type === 'ALERT'
            const isHealing = item.type === 'HEALING'
            const isSuccess = item.type === 'ACTION'
            const isGround = item.type === 'GROUND'

            return (
              <div
                key={item.id}
                className={`codex-log-line ${isAlert ? 'log-alert' : ''} ${isHealing ? 'log-healing' : ''} ${isSuccess ? 'log-success' : ''} ${isGround ? 'log-ground' : ''}`}
              >
                <span className="log-timestamp">[{item.time}]</span>
                <span className={`log-tag tag-${item.type.toLowerCase()}`}>
                  {item.tag}
                </span>
                <span className="log-arrow">➔</span>
                <span className="log-content">
                  {item.msg}
                </span>
                {item.details && (
                  <span className="log-details-snippet">
                    // {item.details}
                  </span>
                )}
              </div>
            )
          })}
          <div ref={consoleEndRef} />
        </div>
      </div>
    </div>
  )
}

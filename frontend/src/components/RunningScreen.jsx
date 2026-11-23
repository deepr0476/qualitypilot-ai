export default function RunningScreen({ omniScriptData, activeCasesCount }) {
  return (
    <div className="card running-screen-card">
      <div className="running-header">
        <div className="spinner-large" />
        <div className="agent-badge-pill">
          <span className="dot pulse" /> Agent 03 · QA Executor (Playwright)
        </div>
        <h2>Executing OmniScript Test Suite</h2>
        <p className="card-subtext">
          Target Salesforce Flow: <strong>{omniScriptData?.omniScriptName || 'Salesforce Flow'}</strong>
        </p>
      </div>

      <div className="execution-steps-monitor">
        <div className="monitor-item done">
          <span className="monitor-icon">✓</span>
          <div>
            <strong>Playwright Browser Initialized (Headed Live Visibility)</strong>
            <p>Authenticating via OAuth 2.0 JWT Frontdoor Bridge</p>
          </div>
        </div>

        <div className="monitor-item active">
          <span className="monitor-icon spinner-small" />
          <div>
            <strong>Executing Salesforce Lifecycle Steps &amp; Piercing Shadow DOM</strong>
            <p>Waiting for Lightning layouts, spinners &amp; resolving LWC / OmniScript locators</p>
          </div>
        </div>

        <div className="monitor-item pending">
          <span className="monitor-icon">⏱</span>
          <div>
            <strong>Executing {activeCasesCount || 'All'} Positive &amp; Negative Scenarios</strong>
            <p>Processing REST API transactions &amp; Playwright headed UI actions</p>
          </div>
        </div>

        <div className="monitor-item pending">
          <span className="monitor-icon">📸</span>
          <div>
            <strong>Capturing Video &amp; Evidence Artifacts</strong>
            <p>Recording live 1280x720 video (.webm) &amp; full-page screenshots</p>
          </div>
        </div>
      </div>
    </div>
  )
}

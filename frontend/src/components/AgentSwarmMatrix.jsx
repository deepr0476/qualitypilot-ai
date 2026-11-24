import React from 'react'

export default function AgentSwarmMatrix({ currentStage = 'ANALYZE', loading = false, activeOverride = null }) {
  const agents = [
    {
      id: 'agent-01',
      num: 'Agent 01',
      title: 'Requirement Analyst',
      icon: '🕵️‍♂️',
      desc: 'Text scanning & schema inference',
      activeOn: ['ANALYZE'],
      activeText: loading && currentStage === 'ANALYZE' ? 'Scanning Schema…' : 'Active (Scanning)',
      idleText: 'Requirements Grounded',
    },
    {
      id: 'agent-02',
      num: 'Agent 02',
      title: 'Test Case Architect',
      icon: '📐',
      desc: 'Blueprint building & steps',
      activeOn: ['DESIGN'],
      activeText: loading && currentStage === 'DESIGN' ? 'Designing Tests…' : 'Active (Architecting)',
      idleText: 'Blueprints Ready',
    },
    {
      id: 'agent-03',
      num: 'Agent 03',
      title: 'Playwright Core Runner',
      icon: '💻',
      desc: 'Browser interaction & live UI',
      activeOn: ['EXECUTE'],
      activeText: 'Active (Browser Runner)',
      idleText: 'Core Engine Armed',
    },
    {
      id: 'agent-04',
      num: 'Agent 04',
      title: 'CodeX Self-Healing Engine',
      icon: '🩺',
      desc: 'Shadow-DOM locator resolver',
      activeOn: ['EXECUTE', 'REPORT'],
      activeText: 'Active (Auto-Healing)',
      idleText: 'Mutation Guard Active',
    },
    {
      id: 'agent-05',
      num: 'Agent 05',
      title: 'REST DB Grounding Asserter',
      icon: '📊',
      desc: 'TC-005 API persistence checks',
      activeOn: ['EXECUTE', 'REPORT'],
      activeText: 'Active (DB Grounding)',
      idleText: 'SObject Asserter Ready',
    },
    {
      id: 'agent-06',
      num: 'Agent 06',
      title: 'Corporate Report Compiler',
      icon: '📄',
      desc: 'Executive PDF generation & audit',
      activeOn: ['REPORT'],
      activeText: 'Active (Compiling PDF)',
      idleText: 'Audit Compiler Ready',
    },
  ]

  return (
    <div className="agent-swarm-container" style={{ marginBottom: '1.25rem' }}>
      <div className="agent-swarm-header" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.6rem',
        padding: '0 2px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--keonos-orange, #FF8300)' }}>
            ⚡ KEONOS 6-Agent Executive Swarm Matrix
          </span>
          <span className="swarm-live-pill" style={{
            fontSize: '10px',
            fontWeight: '800',
            padding: '2px 8px',
            borderRadius: '9999px',
            background: 'rgba(34, 197, 94, 0.15)',
            color: '#22c55e',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>
            Autonomous Orchestration
          </span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted, #94A3B8)', fontWeight: '600' }}>
          Zero-Touch Execution Protocol · 100% Zoom Sizing
        </div>
      </div>

      <div className="agent-swarm-grid">
        {agents.map((agent) => {
          const isExplicitActive = activeOverride === agent.id
          const isStageActive = agent.activeOn.includes(currentStage)
          const isActive = isExplicitActive || (activeOverride === null && isStageActive)
          const isExecuting = loading && isActive

          return (
            <div
              key={agent.id}
              className={`agent-swarm-card ${isActive ? 'active' : 'idle'} ${isExecuting ? 'pulsing' : ''}`}
              title={`${agent.num}: ${agent.title} — ${agent.desc}`}
            >
              <div className="agent-card-top">
                <span className="agent-icon" role="img" aria-label={agent.title}>
                  {agent.icon}
                </span>
                <div className="agent-pulse-wrapper">
                  <span className={`agent-pulse-dot ${isActive ? 'active-dot' : 'idle-dot'}`} />
                  <span className="agent-status-label">
                    {isActive ? agent.activeText : agent.idleText}
                  </span>
                </div>
              </div>

              <div className="agent-card-body">
                <div className="agent-num-badge">{agent.num}</div>
                <div className="agent-title-text">{agent.title}</div>
                <div className="agent-desc-text">{agent.desc}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

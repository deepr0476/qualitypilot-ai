import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

const STAGE_CONFIG = [
  { id: 'ANALYZE', agent: 'Agent 01', label: 'Requirement Analyst', icon: '🧠' },
  { id: 'DESIGN', agent: 'Agent 02', label: 'Test Designer', icon: '📝' },
  { id: 'EXECUTE', agent: 'Agent 03', label: 'Universal QA Executor', icon: '⚡' },
  { id: 'REPORT', agent: 'Agents 04-06', label: 'Self-Healing & Defects', icon: '🩺' },
]

export default function Header({ currentStage, onReset, theme = 'dark', onToggleTheme, onOrgConnected, onNavigateStage }) {
  const currentIdx = STAGE_CONFIG.findIndex((s) => s.id === currentStage)
  const [orgModalOpen, setOrgModalOpen] = useState(false)
  const [orgStatus, setOrgStatus] = useState(null)

  // Auth Form State
  const [authMethodTab, setAuthMethodTab] = useState('credentials') // 'credentials' | 'token'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [securityToken, setSecurityToken] = useState('')
  const [environment, setEnvironment] = useState('production')
  const [customLoginUrl, setCustomLoginUrl] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [tokenInstanceUrl, setTokenInstanceUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [jwtLoading, setJwtLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const fetchOrgStatus = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/auth/org-status`)
      if (res.data) {
        setOrgStatus(res.data)
        if (onOrgConnected) onOrgConnected(res.data)
      }
    } catch (_) {}
  }

  // 1-Click Connect via OAuth 2.0 JWT Certificate (if configured on backend)
  const handleJwtConnect = async () => {
    setJwtLoading(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await axios.post(`${BACKEND_URL}/api/auth/jwt-connect`)
      const data = res.data
      setSuccessMsg(`Connected successfully to ${data.username || 'Salesforce Org'} (${data.orgName || 'Active Org'}) via OAuth 2.0 JWT!`)
      
      const newStatus = {
        connected: true,
        username: data.username || 'Connected User',
        orgName: data.orgName || 'Connected Org',
        instanceUrl: data.instanceUrl,
        domain: data.instanceUrl ? new URL(data.instanceUrl).hostname : '',
        authMethod: 'OAuth-2.0-JWT-Bearer',
      }
      setOrgStatus(newStatus)
      if (onOrgConnected) onOrgConnected(newStatus)

      setTimeout(() => {
        setOrgModalOpen(false)
        setSuccessMsg(null)
      }, 1200)
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'JWT Connection failed.'
      setError(msg)
    } finally {
      setJwtLoading(false)
    }
  }

  // Direct Session ID / Access Token Submission to POST /api/auth/token
  const handleTokenSubmit = async (e) => {
    e.preventDefault()
    if (!accessToken.trim()) {
      setError('Please provide a valid Salesforce Access Token or Session ID.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const res = await axios.post(`${BACKEND_URL}/api/auth/token`, {
        accessToken: accessToken.trim(),
        instanceUrl: tokenInstanceUrl.trim() || 'https://kns5-dev-ed.develop.my.salesforce.com',
      })

      const data = res.data
      setSuccessMsg(`Successfully connected to ${data.username} (${data.orgName || 'Target Org'})!`)

      const newStatus = {
        connected: true,
        username: data.username,
        orgName: data.orgName || 'Target Org',
        instanceUrl: data.instanceUrl,
        domain: data.instanceUrl ? new URL(data.instanceUrl).hostname : '',
        authMethod: 'Direct-Access-Token',
      }
      setOrgStatus(newStatus)
      if (onOrgConnected) onOrgConnected(newStatus)

      setTimeout(() => {
        setOrgModalOpen(false)
        setSuccessMsg(null)
      }, 1200)
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Access Token authentication failed.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrgStatus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && orgModalOpen) {
        setOrgModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [orgModalOpen])

  // Direct Credentials Submission to POST /api/auth/manual
  const handleDirectCredentialsSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Please provide both Salesforce Username and Password.')
      return
    }

    if (environment === 'custom' && !customLoginUrl.trim()) {
      setError('Please provide your Custom My Domain / Login URL.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const targetLogin = environment === 'custom' ? customLoginUrl.trim() : environment
      const res = await axios.post(`${BACKEND_URL}/api/auth/manual`, {
        username: username.trim(),
        password: password.trim(),
        securityToken: securityToken.trim(),
        loginUrl: targetLogin,
        environment,
        customLoginUrl: customLoginUrl.trim(),
      })

      const data = res.data
      setSuccessMsg(`Successfully connected to ${data.username || username} (${data.orgName || 'Target Org'})!`)
      
      const newStatus = {
        connected: true,
        username: data.username || username.trim(),
        orgName: data.orgName || 'Target Org',
        instanceUrl: data.instanceUrl,
        domain: data.instanceUrl ? new URL(data.instanceUrl).hostname : '',
      }
      setOrgStatus(newStatus)
      if (onOrgConnected) onOrgConnected(newStatus)

      setTimeout(() => {
        setOrgModalOpen(false)
        setSuccessMsg(null)
      }, 1000)
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Salesforce authentication failed.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/auth/disconnect`)
      const disconnectedState = { connected: false, username: null, instanceUrl: null, orgName: null, domain: null }
      setOrgStatus(disconnectedState)
      if (onOrgConnected) onOrgConnected(disconnectedState)
      setSuccessMsg('Org disconnected. Session cleared.')
      setTimeout(() => setSuccessMsg(null), 2000)
    } catch (_) {}
  }

  const isLight = theme === 'light'

  return (
    <header className="app-header">
      <div className="header-brand" onClick={onReset} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img
          src="/keonos-logo.png"
          alt="KEONOS Logo"
          style={{ height: '42px', width: 'auto', objectFit: 'contain', borderRadius: '6px' }}
        />
        <div>
          <div className="brand-top-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="brand-name" style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', letterSpacing: '-0.02em', display: 'inline-flex', alignItems: 'center', gap: '6px', lineHeight: '1.2' }}>
              <span style={{ color: '#FF8300', fontWeight: '900' }}>KEONOS</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>|</span>
              <span style={{ color: 'var(--text-primary)' }}>Quality X</span>
            </h1>
            <span className="hackathon-tag" style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(255, 131, 0, 0.2), rgba(250, 140, 22, 0.25))',
              border: '1px solid #FF8300',
              color: '#FF8300',
              fontWeight: '800',
              fontSize: '0.68rem',
              letterSpacing: '0.06em',
              padding: '3px 9px',
              borderRadius: '999px',
              lineHeight: '1',
              height: 'fit-content',
              verticalAlign: 'middle',
              boxSizing: 'border-box',
            }}>
              INNOVATE 2026
            </span>
          </div>
          <p className="brand-tagline" style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Three Minds. Zero Defects. · Multi-Agent Salesforce QA &amp; Self-Healing Engine (OmniScript · Lightning · REST API · Hybrid CPQ)
          </p>
        </div>
      </div>

      <div className="header-right-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <nav className="multi-agent-stepper">
          {STAGE_CONFIG.map((stage, idx) => {
            const isDone = idx < currentIdx
            const isActive = idx === currentIdx
            return (
              <div
                key={stage.id}
                className={`agent-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                onClick={() => {
                  if (onNavigateStage && stage.id !== 'EXECUTE') {
                    onNavigateStage(stage.id)
                  }
                }}
                style={{
                  cursor: onNavigateStage && stage.id !== 'EXECUTE' ? 'pointer' : 'default',
                  transition: 'transform 0.15s ease',
                }}
                title={onNavigateStage && stage.id !== 'EXECUTE' ? `Switch to ${stage.agent} (${stage.label})` : undefined}
              >
                <div className="agent-circle">
                  {isDone ? '✓' : stage.icon}
                </div>
                <div className="agent-info">
                  <span className="agent-num">{stage.agent}</span>
                  <span className="agent-title">{stage.label}</span>
                </div>
                {idx < STAGE_CONFIG.length - 1 && <div className="step-arrow">➔</div>}
              </div>
            )
          })}
        </nav>

        {/* Single Status Indicator Badge Trigger */}
        <button
          type="button"
          className="btn-connect-org-header"
          onClick={() => setOrgModalOpen(true)}
          title={orgStatus?.connected ? `Connected: ${orgStatus.username || ''} (${orgStatus.orgName || orgStatus.instanceUrl || ''})` : 'Connect Salesforce Org'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            background: orgStatus?.connected ? 'linear-gradient(135deg, #FF8300, #FA8C16)' : 'var(--bg-elevated)',
            border: `1px solid ${orgStatus?.connected ? '#FF8300' : 'var(--border)'}`,
            borderRadius: '20px',
            cursor: 'pointer',
            color: orgStatus?.connected ? '#FFFFFF' : 'var(--text-primary)',
            fontSize: '12px',
            fontWeight: '700',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            maxWidth: '280px',
            boxShadow: orgStatus?.connected ? '0 2px 10px rgba(255, 131, 0, 0.4)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          <span style={{ fontSize: '13px', flexShrink: 0 }}>{orgStatus?.connected ? '⚡' : '☁️'}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: orgStatus?.connected ? '#FFFFFF' : 'inherit' }}>
            {orgStatus?.connected
              ? (orgStatus?.username || orgStatus?.orgName || orgStatus?.domain?.split('.')[0] || 'Connected Org')
              : 'Connect Org'}
          </span>
        </button>

        {onToggleTheme && (
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={onToggleTheme}
            title={`Switch to ${isLight ? 'Dark' : 'Light'} Mode`}
            aria-label="Toggle Theme"
          >
            <span className="theme-icon">{isLight ? '🌙' : '☀️'}</span>
            <span className="theme-text">{isLight ? 'Dark' : 'Light'}</span>
          </button>
        )}
      </div>

      {/* Render modal directly in document.body via Portal to prevent any backdrop-filter clipping */}
      {typeof document !== 'undefined' && orgModalOpen && createPortal(
        <div
          className="lightbox-backdrop modal-centered"
          onClick={() => setOrgModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxHeight: '85vh',
              overflowY: 'auto',
              width: '100%',
              maxWidth: '36rem',
              borderRadius: '12px',
              background: isLight ? '#FFFFFF' : '#1E293B',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65)',
              border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              boxSizing: 'border-box',
            }}
          >
            {/* ── Modal Header with Large Prominent ✕ Close Button ── */}
            <div
              className="modal-header-fixed"
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 20,
                background: isLight ? '#F8FAFC' : '#0F172A',
                borderBottom: isLight ? '1px solid #E2E8F0' : '1px solid #334155',
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.25rem' }}>🔐</span>
                <strong style={{ fontSize: '16px', color: isLight ? '#0F172A' : '#F8FAFC', fontWeight: '800' }}>
                  Connect Salesforce Org (Direct Credentials)
                </strong>
              </div>
              <button
                type="button"
                onClick={() => setOrgModalOpen(false)}
                title="Close modal (Esc)"
                aria-label="Close modal"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: isLight ? '#E2E8F0' : '#334155',
                  border: isLight ? '1px solid #CBD5E1' : '1px solid #475569',
                  color: isLight ? '#0F172A' : '#F8FAFC',
                  fontSize: '20px',
                  fontWeight: '900',
                  cursor: 'pointer',
                  lineHeight: 1,
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* ── Form Body with Explicit HTML Inputs ── */}
            <div className="modal-inner-content" style={{ padding: '20px 24px', flex: 1, boxSizing: 'border-box' }}>
              {orgStatus?.connected && (
                <div
                  style={{
                    background: isLight ? '#F1F5F9' : '#0F172A',
                    border: '1px solid #10B981',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: isLight ? '#0F172A' : '#F8FAFC' }}>
                      🟢 Active: <span>{orgStatus.username || orgStatus.orgName}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: isLight ? '#475569' : '#94A3B8', marginTop: '2px' }}>
                      {orgStatus.domain || orgStatus.instanceUrl} {orgStatus.authMethod ? `(${orgStatus.authMethod})` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    style={{
                      background: 'none',
                      border: '1px solid #EF4444',
                      color: '#EF4444',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              )}

              {error && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid #EF4444',
                    color: '#DC2626',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                    fontSize: '13px',
                    fontWeight: '600',
                  }}
                >
                  ⚠️ {error}
                </div>
              )}

              {successMsg && (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid #10B981',
                    color: '#059669',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                    fontSize: '13px',
                    fontWeight: '700',
                  }}
                >
                  ✅ {successMsg}
                </div>
              )}

              {/* ── Method Tab Switcher (Credentials vs Token) ── */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => setAuthMethodTab('credentials')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    border: authMethodTab === 'credentials'
                      ? '1.5px solid #FF8300'
                      : (isLight ? '1px solid #CBD5E1' : '1px solid #334155'),
                    background: authMethodTab === 'credentials'
                      ? (isLight ? '#FFF7ED' : 'rgba(255, 131, 0, 0.15)')
                      : (isLight ? '#F8FAFC' : '#0F172A'),
                    color: authMethodTab === 'credentials'
                      ? (isLight ? '#EA580C' : '#FF8300')
                      : (isLight ? '#475569' : '#94A3B8'),
                    transition: 'all 0.15s ease',
                  }}
                >
                  🔑 Username &amp; Password
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethodTab('token')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    border: authMethodTab === 'token'
                      ? '1.5px solid #FF8300'
                      : (isLight ? '1px solid #CBD5E1' : '1px solid #334155'),
                    background: authMethodTab === 'token'
                      ? (isLight ? '#FFF7ED' : 'rgba(255, 131, 0, 0.15)')
                      : (isLight ? '#F8FAFC' : '#0F172A'),
                    color: authMethodTab === 'token'
                      ? (isLight ? '#EA580C' : '#FF8300')
                      : (isLight ? '#475569' : '#94A3B8'),
                    transition: 'all 0.15s ease',
                  }}
                >
                  🎟️ Session ID / Access Token
                </button>
              </div>

              {/* ── Form Option A: Username & Password ── */}
              {authMethodTab === 'credentials' && (
                <form onSubmit={handleDirectCredentialsSubmit}>
                  {/* Environment */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: isLight ? '#0F172A' : '#F8FAFC', marginBottom: '6px' }}>
                      Environment / Login URL Type
                    </label>
                    <select
                      value={environment}
                      onChange={(e) => setEnvironment(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded mb-4 text-[#0F172A] bg-white"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: isLight ? '1px solid #CBD5E1' : '1px solid #475569',
                        background: isLight ? '#FFFFFF' : '#0F172A',
                        color: isLight ? '#0F172A' : '#F8FAFC',
                        fontSize: '13px',
                        fontWeight: '600',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="production">Production / Developer Edition (login.salesforce.com)</option>
                      <option value="sandbox">Sandbox (test.salesforce.com)</option>
                      <option value="custom">Custom My Domain URL (e.g. yourcompany.my.salesforce.com)</option>
                    </select>
                  </div>

                  {/* Custom My Domain URL Input */}
                  {environment === 'custom' && (
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: isLight ? '#0F172A' : '#F8FAFC', marginBottom: '6px' }}>
                        Salesforce Login / My Domain URL <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="https://yourcompany.my.salesforce.com"
                        value={customLoginUrl}
                        onChange={(e) => setCustomLoginUrl(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded mb-2 text-[#0F172A] bg-white font-bold"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: isLight ? '1px solid #CBD5E1' : '1px solid #475569',
                          background: isLight ? '#FFFFFF' : '#0F172A',
                          color: isLight ? '#0F172A' : '#F8FAFC',
                          fontSize: '13px',
                          fontWeight: '700',
                          boxSizing: 'border-box',
                        }}
                      />
                      <span style={{ fontSize: '11px', color: isLight ? '#64748B' : '#94A3B8', display: 'block', lineHeight: '1.4' }}>
                        💡 Paste your org&apos;s dedicated URL (supports <code>.my.salesforce.com</code> or <code>.lightning.force.com</code>).
                      </span>
                    </div>
                  )}

                  {/* Salesforce Username */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: isLight ? '#0F172A' : '#F8FAFC', marginBottom: '6px' }}>
                      Salesforce Username <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter remote username (e.g. goransh.raghav...)"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded mb-4 text-[#0F172A] bg-white font-bold"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: isLight ? '1px solid #CBD5E1' : '1px solid #475569',
                        background: isLight ? '#FFFFFF' : '#0F172A',
                        color: isLight ? '#0F172A' : '#F8FAFC',
                        fontSize: '13px',
                        fontWeight: '700',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Password */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: isLight ? '#0F172A' : '#F8FAFC', marginBottom: '6px' }}>
                      Password <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded mb-4 text-[#0F172A] bg-white font-bold"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: isLight ? '1px solid #CBD5E1' : '1px solid #475569',
                        background: isLight ? '#FFFFFF' : '#0F172A',
                        color: isLight ? '#0F172A' : '#F8FAFC',
                        fontSize: '13px',
                        fontWeight: '700',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Security Token */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: isLight ? '#0F172A' : '#F8FAFC', marginBottom: '6px' }}>
                      Security Token
                    </label>
                    <input
                      type="text"
                      placeholder="Enter 24-character security token"
                      value={securityToken}
                      onChange={(e) => setSecurityToken(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded mb-6 text-[#0F172A] bg-white font-bold"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: isLight ? '1px solid #CBD5E1' : '1px solid #475569',
                        background: isLight ? '#FFFFFF' : '#0F172A',
                        color: isLight ? '#0F172A' : '#F8FAFC',
                        fontSize: '13px',
                        fontWeight: '700',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Action Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full text-white font-bold py-3 px-4 rounded shadow-lg transition duration-200"
                    style={{
                      width: '100%',
                      padding: '12px 18px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #FF8300, #FA8C16)',
                      color: '#FFFFFF',
                      fontWeight: '800',
                      fontSize: '14px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(255, 131, 0, 0.45)',
                      boxSizing: 'border-box',
                    }}
                  >
                    {loading ? (
                      <>
                        <span className="btn-spinner" /> ⚙️ Verifying Connection &amp; Layout Integrity…
                      </>
                    ) : (
                      'Connect Org via Direct Credentials'
                    )}
                  </button>
                </form>
              )}

              {/* ── Form Option B: Direct Access Token / Session ID ── */}
              {authMethodTab === 'token' && (
                <form onSubmit={handleTokenSubmit}>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: isLight ? '#0F172A' : '#F8FAFC', marginBottom: '6px' }}>
                      Salesforce Instance URL <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="https://yourcompany.my.salesforce.com"
                      value={tokenInstanceUrl}
                      onChange={(e) => setTokenInstanceUrl(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded mb-2 text-[#0F172A] bg-white font-bold"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: isLight ? '1px solid #CBD5E1' : '1px solid #475569',
                        background: isLight ? '#FFFFFF' : '#0F172A',
                        color: isLight ? '#0F172A' : '#F8FAFC',
                        fontSize: '13px',
                        fontWeight: '700',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: isLight ? '#0F172A' : '#F8FAFC', marginBottom: '6px' }}>
                      Access Token / Session ID <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Paste your access_token or sid cookie value here..."
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: isLight ? '1px solid #CBD5E1' : '1px solid #475569',
                        background: isLight ? '#FFFFFF' : '#0F172A',
                        color: isLight ? '#0F172A' : '#F8FAFC',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        fontWeight: '600',
                        boxSizing: 'border-box',
                      }}
                    />
                    <span style={{ fontSize: '11px', color: isLight ? '#64748B' : '#94A3B8', display: 'block', marginTop: '4px', lineHeight: '1.4' }}>
                      💡 Tip: Obtain from <code>sf org display --target-org &lt;alias&gt;</code>, or copy the <code>sid</code> cookie from browser DevTools. Guaranteed to bypass MFA and password expiration.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '12px 18px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#10B981',
                      color: '#FFFFFF',
                      fontWeight: '800',
                      fontSize: '14px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                      boxSizing: 'border-box',
                    }}
                  >
                    {loading ? (
                      <>
                        <span className="btn-spinner" /> ⏳ Connecting via Session Token…
                      </>
                    ) : (
                      'Connect Org via Session Token'
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  )
}

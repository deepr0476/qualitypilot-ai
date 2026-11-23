import { useState, useEffect } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export default function ConnectOrgModal({ isOpen, onClose, orgStatus, onOrgUpdated }) {
  const [activeTab, setActiveTab] = useState('credentials'); // 'credentials' | 'oauth' | 'jwt'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Tab 1: Direct Credentials State
  const [credEnv, setCredEnv] = useState('https://login.salesforce.com');
  const [credCustomDomain, setCredCustomDomain] = useState('');
  const [manualUsername, setManualUsername] = useState('');
  const [manualPassword, setManualPassword] = useState('');
  const [manualSecurityToken, setManualSecurityToken] = useState('');

  // Tab 2: OAuth Web Login State
  const [oauthEnv, setOauthEnv] = useState('https://login.salesforce.com');
  const [customMyDomain, setCustomMyDomain] = useState('');
  const [oauthClientId, setOauthClientId] = useState('3MVG9JJwBBbcN47JrQsqbCKVmetwHT2lyGOw1q2rAClm94_JLyosT6UOqd9h3hysd6N6zPTAEsDT_pT913Ns0');

  // Tab 3: JWT / Direct Token State
  const [subMode, setSubMode] = useState('jwt'); // 'jwt' | 'direct'
  const [instanceUrl, setInstanceUrl] = useState(orgStatus?.instanceUrl || 'https://kns5-dev-ed.develop.my.salesforce.com');
  const [jwtClientId, setJwtClientId] = useState(orgStatus?.clientId || '3MVG9JJwBBbcN47JrQsqbCKVmetwHT2lyGOw1q2rAClm94_JLyosT6UOqd9h3hysd6N6zPTAEsDT_pT913Ns0');
  const [username, setUsername] = useState(orgStatus?.username || '');
  const [privateKey, setPrivateKey] = useState('');
  const [directToken, setDirectToken] = useState('');
  const [loginUrl, setLoginUrl] = useState('https://login.salesforce.com');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'SALESFORCE_ORG_CONNECTED') {
        setSuccessMsg(`Successfully connected to ${event.data.orgName}!`);
        setLoading(false);
        if (onOrgUpdated) onOrgUpdated();
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onClose, onOrgUpdated]);

  if (!isOpen) return null;

  // 1. Direct Manual Credentials Login
  const handleManualCredentialsLogin = async (e) => {
    e.preventDefault();
    if (!manualUsername.trim() || !manualPassword.trim()) {
      setError('Please provide both Salesforce Username and Password.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const targetLogin = credEnv === 'custom' ? (credCustomDomain.trim() || 'https://login.salesforce.com') : credEnv;
      const res = await fetch(`${BACKEND_URL}/api/auth/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: manualUsername.trim(),
          password: manualPassword.trim(),
          securityToken: manualSecurityToken.trim(),
          loginUrl: targetLogin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Salesforce credentials authentication failed.');
      }

      setSuccessMsg(`Successfully connected to ${data.username || 'target org'} (${data.orgName}) via Direct Credentials!`);
      if (onOrgUpdated) onOrgUpdated();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. OAuth Web Login
  const handleOAuthLogin = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const targetLogin = oauthEnv === 'custom' ? (customMyDomain.trim() || 'https://login.salesforce.com') : oauthEnv;
      const res = await fetch(`${BACKEND_URL}/api/auth/login-url?loginUrl=${encodeURIComponent(targetLogin)}&clientId=${encodeURIComponent(oauthClientId.trim())}`);
      if (!res.ok) throw new Error('Failed to generate Salesforce OAuth URL');
      const data = await res.json();

      const width = 600;
      const height = 750;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      const popup = window.open(
        data.authUrl,
        'SalesforceOAuth',
        `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
      );

      const pollTimer = setInterval(async () => {
        try {
          if (popup.closed) {
            clearInterval(pollTimer);
            const statusRes = await fetch(`${BACKEND_URL}/api/auth/org-status`);
            const statusData = await statusRes.json();
            if (statusData.connected) {
              setSuccessMsg(`Connected live to ${statusData.orgName}!`);
              if (onOrgUpdated) onOrgUpdated();
              setTimeout(() => onClose(), 1500);
            }
            setLoading(false);
          }
        } catch (_) {}
      }, 1500);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // 3. File upload for private key
  const handleKeyFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setPrivateKey(event.target?.result || '');
    };
    reader.readAsText(file);
  };

  // 4. Connect via JWT or Direct Token
  const handleConnectCredentials = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        authMethod: subMode,
        instanceUrl: instanceUrl.trim(),
      };

      if (subMode === 'jwt') {
        if (!jwtClientId.trim() || !username.trim() || !privateKey.trim()) {
          throw new Error('Client ID, Username, and Private Key are mandatory for JWT Bearer Flow.');
        }
        payload.clientId = jwtClientId.trim();
        payload.username = username.trim();
        payload.privateKey = privateKey.trim();
        payload.loginUrl = loginUrl.trim();
      } else {
        if (!directToken.trim()) {
          throw new Error('Access Token is mandatory for Direct Token Flow.');
        }
        payload.accessToken = directToken.trim();
      }

      const res = await fetch(`${BACKEND_URL}/api/auth/connect-org`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to connect Salesforce Org');
      }

      setSuccessMsg(`Successfully connected to ${data.orgName} (${data.instanceUrl})!`);
      if (onOrgUpdated) onOrgUpdated();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 5. Disconnect custom org
  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect custom Salesforce Org and revert to default .env configuration?')) return;
    setLoading(true);
    try {
      await fetch(`${BACKEND_URL}/api/auth/disconnect`, { method: 'POST' });
      setSuccessMsg('Disconnected custom org. Restored default settings.');
      if (onOrgUpdated) onOrgUpdated();
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="lightbox-backdrop modal-centered"
      onClick={onClose}
    >
      <div
        className="lightbox-modal connect-org-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Pinned Fixed Header ──────────────────────────── */}
        <div className="lightbox-top modal-header-fixed" style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>☁️</span>
            <strong style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: '700' }}>
              Connect Salesforce Org
            </strong>
          </div>
          <button
            type="button"
            className="btn-modal-close-x"
            onClick={onClose}
            title="Close modal (Esc)"
            aria-label="Close modal"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontSize: '18px',
              fontWeight: '800',
              cursor: 'pointer',
              lineHeight: 1,
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Scrollable Body Content ──────────────────────── */}
        <div className="modal-inner-content">
          {/* Active Status Badge Strip */}
          <div className="connected-status-banner" style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}>
                <span style={{ color: '#10b981' }}>●</span>
                <span>Active Org: <strong>{orgStatus?.orgName || 'Live Salesforce Org'}</strong></span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                <code>{orgStatus?.domain || orgStatus?.instanceUrl}</code> · <span>User: {orgStatus?.username}</span>
              </div>
            </div>
            {orgStatus?.isCustomConnected && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleDisconnect}
                disabled={loading}
                style={{ color: '#ef4444', fontSize: '12px', padding: '4px 10px' }}
              >
                Disconnect
              </button>
            )}
          </div>

          {/* 3-Tab Selector */}
          <div className="tabs-group" style={{ marginBottom: '1.25rem', display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'credentials' ? 'active' : ''}`}
              onClick={() => { setActiveTab('credentials'); setError(null); }}
              style={{ flex: 1.2, padding: '8px', fontWeight: '700' }}
            >
              🔐 Direct Credentials
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'oauth' ? 'active' : ''}`}
              onClick={() => { setActiveTab('oauth'); setError(null); }}
              style={{ flex: 1, padding: '8px' }}
            >
              🌐 OAuth Login
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'jwt' ? 'active' : ''}`}
              onClick={() => { setActiveTab('jwt'); setError(null); }}
              style={{ flex: 1, padding: '8px' }}
            >
              🔑 JWT / Token
            </button>
          </div>

          {error && (
            <div className="error-banner" style={{ marginBottom: '1rem', padding: '8px 12px', borderRadius: '6px' }}>
              <span>⚠️ {error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399', padding: '10px 14px', borderRadius: '6px', marginBottom: '1rem', fontSize: '13px' }}>
              ✅ {successMsg}
            </div>
          )}

          {/* ── TAB 1: Direct Credentials (Primary) ────────────── */}
          {activeTab === 'credentials' && (
            <form onSubmit={handleManualCredentialsLogin} className="credentials-tab-content">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.5' }}>
                Connect ANY company or developer Salesforce org instantly via standard credentials. Bypasses Connected App OAuth redirect mismatches completely.
              </p>

              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                  Target Salesforce Environment
                </label>
                <select
                  className="input"
                  value={credEnv}
                  onChange={(e) => setCredEnv(e.target.value)}
                  style={{ width: '100%', padding: '8px' }}
                >
                  <option value="https://login.salesforce.com">Production / Developer Edition (login.salesforce.com)</option>
                  <option value="https://test.salesforce.com">Sandbox (test.salesforce.com)</option>
                  <option value="custom">Custom My Domain URL</option>
                </select>
              </div>

              {credEnv === 'custom' && (
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                    Salesforce My Domain URL
                  </label>
                  <input
                    type="url"
                    className="input code-font"
                    placeholder="https://yourcompany.my.salesforce.com"
                    value={credCustomDomain}
                    onChange={(e) => setCredCustomDomain(e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                  Salesforce Username <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input code-font"
                  placeholder="e.g. yourname@company.com"
                  value={manualUsername}
                  onChange={(e) => setManualUsername(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                  Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="password"
                  className="input"
                  placeholder="Your Salesforce Password"
                  value={manualPassword}
                  onChange={(e) => setManualPassword(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                  Security Token <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>(Optional if Login IP Ranges unrestricted)</span>
                </label>
                <input
                  type="password"
                  className="input"
                  placeholder="Salesforce Security Token"
                  value={manualSecurityToken}
                  onChange={(e) => setManualSecurityToken(e.target.value)}
                  style={{ width: '100%', padding: '8px' }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary pulse-btn btn-full"
                disabled={loading || !manualUsername.trim() || !manualPassword.trim()}
                style={{ padding: '10px 16px', fontWeight: '700', width: '100%' }}
              >
                {loading ? '⏳ Verifying Credentials…' : '🔐 Connect Org via Direct Credentials'}
              </button>
            </form>
          )}

          {/* ── TAB 2: OAuth Web Login ─────────────────────────── */}
          {activeTab === 'oauth' && (
            <div className="oauth-tab-content">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.5' }}>
                Connect through official browser OAuth 2.0 Web Server Flow. Requires Connected App callback URL to match your app domain.
              </p>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Target Salesforce Environment</label>
                <select
                  className="input"
                  value={oauthEnv}
                  onChange={(e) => setOauthEnv(e.target.value)}
                  style={{ width: '100%', padding: '8px' }}
                >
                  <option value="https://login.salesforce.com">Production / Developer Edition (login.salesforce.com)</option>
                  <option value="https://test.salesforce.com">Sandbox (test.salesforce.com)</option>
                  <option value="custom">Custom My Domain URL</option>
                </select>
              </div>

              {oauthEnv === 'custom' && (
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Salesforce My Domain URL</label>
                  <input
                    type="url"
                    className="input code-font"
                    placeholder="https://yourcompany.my.salesforce.com"
                    value={customMyDomain}
                    onChange={(e) => setCustomMyDomain(e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
                  Connected App Client ID <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>(Default Pre-configured)</span>
                </label>
                <input
                  type="text"
                  className="input code-font"
                  value={oauthClientId}
                  onChange={(e) => setOauthClientId(e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '12px' }}
                />
              </div>

              <button
                type="button"
                className="btn btn-primary pulse-btn btn-full"
                onClick={handleOAuthLogin}
                disabled={loading}
                style={{ padding: '10px 16px', fontWeight: '600', width: '100%' }}
              >
                {loading ? '⏳ Waiting for Salesforce Login Approval…' : '🚀 Log In with Salesforce (One-Click)'}
              </button>
            </div>
          )}

          {/* ── TAB 3: JWT Bearer & Direct Token ───────────────── */}
          {activeTab === 'jwt' && (
            <form onSubmit={handleConnectCredentials} className="jwt-tab-content">
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${subMode === 'jwt' ? 'btn-secondary' : 'btn-ghost'}`}
                  onClick={() => setSubMode('jwt')}
                  style={{ flex: 1 }}
                >
                  OAuth 2.0 JWT Bearer Flow
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${subMode === 'direct' ? 'btn-secondary' : 'btn-ghost'}`}
                  onClick={() => setSubMode('direct')}
                  style={{ flex: 1 }}
                >
                  Direct Session Access Token
                </button>
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Salesforce Instance URL *</label>
                <input
                  type="url"
                  className="input code-font"
                  required
                  placeholder="https://your-org.develop.my.salesforce.com"
                  value={instanceUrl}
                  onChange={(e) => setInstanceUrl(e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '12px' }}
                />
              </div>

              {subMode === 'jwt' ? (
                <>
                  <div className="form-row-2" style={{ display: 'flex', gap: '10px', marginBottom: '0.75rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Client ID (Consumer Key) *</label>
                      <input
                        type="text"
                        className="input code-font"
                        required
                        value={jwtClientId}
                        onChange={(e) => setJwtClientId(e.target.value)}
                        style={{ width: '100%', padding: '8px', fontSize: '11px' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Salesforce Username *</label>
                      <input
                        type="text"
                        className="input code-font"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={{ width: '100%', padding: '8px', fontSize: '11px' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600' }}>RSA Private Key (.key) *</label>
                      <label className="btn-link-action" style={{ fontSize: '11px', cursor: 'pointer' }}>
                        📁 Upload .key file
                        <input type="file" accept=".key,.pem,.txt" onChange={handleKeyFileUpload} style={{ display: 'none' }} />
                      </label>
                    </div>
                    <textarea
                      rows={4}
                      className="input code-font"
                      required
                      placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                      style={{ width: '100%', padding: '8px', fontSize: '11px' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Login Audience URL</label>
                    <input
                      type="text"
                      className="input code-font"
                      value={loginUrl}
                      onChange={(e) => setLoginUrl(e.target.value)}
                      style={{ width: '100%', padding: '8px', fontSize: '12px' }}
                    />
                  </div>
                </>
              ) : (
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Session Access Token (sid) *</label>
                  <textarea
                    rows={4}
                    className="input code-font"
                    required
                    placeholder="00Dak00000fAf3t!..."
                    value={directToken}
                    onChange={(e) => setDirectToken(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '11px' }}
                  />
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loading}
                style={{ padding: '10px 16px', fontWeight: '600', width: '100%' }}
              >
                {loading ? '⏳ Validating Salesforce Connection…' : '⚡ Verify & Connect Org'}
              </button>
            </form>
          )}
        </div>

        {/* ── Pinned Fixed Footer with Cancel Button ───────── */}
        <div
          className="modal-footer-fixed"
          style={{
            flexShrink: 0,
            background: 'var(--bg-elevated)',
            borderTop: '1px solid var(--border)',
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Connected Org session applies dynamically across all test suites.
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '7px 18px',
              fontWeight: '700',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              color: 'var(--text-primary)',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

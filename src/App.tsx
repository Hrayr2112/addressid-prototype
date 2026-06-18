import { useState } from 'react'
import { UserApp } from './UserApp'
import { PartnerApp } from './PartnerApp'

type Stage = 'intro' | 'login-user' | 'login-partner' | 'user' | 'partner'

export function App() {
  const [stage, setStage] = useState<Stage>('intro')

  if (stage === 'user') return <UserApp onSignOut={() => setStage('intro')} />
  if (stage === 'partner')
    return <PartnerApp onSignOut={() => setStage('intro')} />

  if (stage === 'login-user' || stage === 'login-partner') {
    const role = stage === 'login-user' ? 'user' : 'partner'
    return (
      <Login
        role={role}
        onBack={() => setStage('intro')}
        onSuccess={() => setStage(role)}
      />
    )
  }

  return (
    <div className="intro">
      <div className="intro-card pop-in">
        <span className="brand-pill">
          <img src="./pin.svg" width={18} height={18} alt="" /> AddressID
        </span>
        <h1>Your address, finally under your control.</h1>
        <p>
          Stop pasting your home address into every form. AddressID turns it into
          a permission you grant — share once, update anywhere, and revoke in a
          tap. Partners always see the address that's current, never a stale one.
        </p>
        <div className="intro-actions">
          <button
            className="btn primary block"
            onClick={() => setStage('login-user')}
          >
            Sign in as User
          </button>
          <button
            className="btn ghost block"
            onClick={() => setStage('login-partner')}
          >
            Sign in as Partner
          </button>
        </div>
        <div className="intro-foot">
          No backend · clickable prototype · all data is in-memory
        </div>
      </div>
    </div>
  )
}

function Login({
  role,
  onBack,
  onSuccess,
}: {
  role: 'user' | 'partner'
  onBack: () => void
  onSuccess: () => void
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (username.trim() === 'admin' && password === 'admin') {
      onSuccess()
    } else {
      setError(true)
    }
  }

  return (
    <div className="intro">
      <div className="intro-card login-card pop-in">
        <span className="brand-pill">
          <img src="./pin.svg" width={18} height={18} alt="" /> AddressID
        </span>
        <h1 style={{ fontSize: 24 }}>
          {role === 'user' ? 'User sign in' : 'Partner sign in'}
        </h1>
        <p style={{ marginBottom: 20 }}>
          {role === 'user'
            ? 'Access your addresses and permissions.'
            : 'Access your partner dashboard.'}
        </p>
        <form onSubmit={submit}>
          <div className="field" style={{ textAlign: 'left' }}>
            <label>Username</label>
            <input
              autoFocus
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setError(false)
              }}
              placeholder="admin"
            />
          </div>
          <div className="field" style={{ textAlign: 'left' }}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(false)
              }}
              placeholder="admin"
            />
          </div>
          {error && (
            <div className="login-error">
              Invalid credentials. Try <strong>admin</strong> /{' '}
              <strong>admin</strong>.
            </div>
          )}
          <button className="btn primary block" type="submit">
            Sign in
          </button>
        </form>
        <div className="login-hint">
          Demo credentials — username <code>admin</code>, password{' '}
          <code>admin</code>
        </div>
        <button className="link-btn" style={{ marginTop: 16 }} onClick={onBack}>
          ← Back
        </button>
      </div>
    </div>
  )
}

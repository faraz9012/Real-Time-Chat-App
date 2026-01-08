import { FormEvent, useState } from 'react'
import './Login.css'

type LoginProps = {
  onLogin: (user: { id: string; name: string }) => void
}

const Login = ({ onLogin }: LoginProps) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedUsername = username.trim().toLowerCase()
    const trimmedDisplay = displayName.trim()
    if (!trimmedUsername || trimmedUsername.length < 3) {
      setError('Username should be at least 3 characters long.')
      return
    }
    if (!password || password.length < 6) {
      setError('Password should be at least 6 characters long.')
      return
    }
    if (mode === 'signup') {
      if (!trimmedDisplay || trimmedDisplay.length < 2) {
        setError('Display name should be at least 2 characters long.')
        return
      }
    }

    setError('')
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: trimmedUsername,
          password,
          displayName: trimmedDisplay,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Unable to continue.')
        return
      }
      onLogin(data)
    } catch (err) {
      setError('Unable to reach the server.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="login">
      <div className="login__card">
        <div className="login__badge">Quick Access</div>
        <h2>{mode === 'login' ? 'Sign in' : 'Create your account'}</h2>
        <p>
          {mode === 'login'
            ? 'Use your username to jump back into the chat.'
            : 'Pick a unique username and a display name for the lounge.'}
        </p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="e.g. aisha"
            autoComplete="username"
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimum 6 characters"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          {mode === 'signup' ? (
            <>
              <label htmlFor="displayName">Display name</label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="e.g. Aisha Khan"
                autoComplete="name"
              />
            </>
          ) : null}
          {error ? <p className="login__error">{error}</p> : null}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Please wait...'
              : mode === 'login'
                ? 'Enter the lounge'
                : 'Create account'}
          </button>
        </form>
        <button
          type="button"
          className="login__toggle"
          onClick={() => {
            setError('')
            setMode((prev) => (prev === 'login' ? 'signup' : 'login'))
          }}
        >
          {mode === 'login'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Sign in'}
        </button>
      </div>
      <div className="login__info">
        <div>
          <h3>Project goals</h3>
          <ul>
            <li>Real-time messaging</li>
            <li>Presence + timestamps</li>
            <li>Simple, resilient UI</li>
          </ul>
        </div>
        <div className="login__tip">
          Tip: open another tab to simulate another user online.
        </div>
      </div>
    </section>
  )
}

export default Login

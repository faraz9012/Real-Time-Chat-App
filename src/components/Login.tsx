import { FormEvent, useState } from 'react'
import './Login.css'

type LoginProps = {
  onLogin: (name: string) => void
}

const Login = ({ onLogin }: LoginProps) => {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Please enter your name to continue.')
      return
    }
    if (trimmed.length < 2) {
      setError('Name should be at least 2 characters long.')
      return
    }
    setError('')
    onLogin(trimmed)
  }

  return (
    <section className="login">
      <div className="login__card">
        <div className="login__badge">Quick Access</div>
        <h2>Sign in with a display name</h2>
        <p>
          This chat uses a lightweight username-based login. Open multiple tabs to
          test real-time delivery.
        </p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="name">Display name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Aisha Khan"
          />
          {error ? <p className="login__error">{error}</p> : null}
          <button type="submit">Enter the lounge</button>
        </form>
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

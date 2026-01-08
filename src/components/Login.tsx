import { FormEvent, useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'

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
    <section className="flex items-center justify-center">
      <Card className="w-full max-w-lg bg-white/90">
        <CardHeader className="space-y-2">
          <CardTitle>{mode === 'login' ? 'Sign in' : 'Create account'}</CardTitle>
          <CardDescription>
            {mode === 'login'
              ? 'Welcome back. Enter your credentials to continue.'
              : 'Create a unique username and a display name.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="e.g. aisha"
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 6 characters"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
            {mode === 'signup' ? (
              <div className="space-y-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="e.g. Aisha Khan"
                  autoComplete="name"
                />
              </div>
            ) : null}
            {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Enter the lounge'
                  : 'Create account'}
            </Button>
          </form>
        </CardContent>
        <div className="px-6 pb-6">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-center"
            onClick={() => {
              setError('')
              setMode((prev) => (prev === 'login' ? 'signup' : 'login'))
            }}
          >
            {mode === 'login'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </Button>
        </div>
      </Card>
    </section>
  )
}

export default Login

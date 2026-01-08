import { useMemo, useState } from 'react'
import './App.css'
import Chat from './components/Chat'
import Login from './components/Login'

type AppUser = {
  id: string
  name: string
}

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `user-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)

  const greeting = useMemo(() => {
    if (!currentUser) return 'Welcome to EchoLine'
    return `Welcome back, ${currentUser.name}`
  }, [currentUser])

  const handleLogin = (name: string) => {
    const user = { id: createId(), name }
    setCurrentUser(user)
  }

  const handleLogout = () => {
    setCurrentUser(null)
  }

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <p className="app__kicker">Real-Time Chat Lab</p>
          <h1 className="app__title">{greeting}</h1>
        </div>
        <div className="app__chip">WebSocket-inspired demo</div>
      </header>
      <main className="app__main">
        {currentUser ? (
          <Chat currentUser={currentUser} onLogout={handleLogout} />
        ) : (
          <Login onLogin={handleLogin} />
        )}
      </main>
      <footer className="app__footer">
        Built for DCN-II: fast, simple, and testable in multiple tabs.
      </footer>
    </div>
  )
}

export default App

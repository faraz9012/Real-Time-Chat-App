import { useMemo, useState } from 'react'
import Chat from './components/Chat'
import Login from './components/Login'

type AppUser = {
  id: string
  name: string
}

function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)

  const greeting = useMemo(() => {
    if (!currentUser) return 'Welcome to EchoLine'
    return `Welcome back, ${currentUser.name}`
  }, [currentUser])

  const handleLogin = (user: AppUser) => {
    setCurrentUser(user)
  }

  const handleLogout = () => {
    setCurrentUser(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-10">
        <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              EchoLine Chat
            </p>
            <h1 className="font-display text-3xl text-slate-900 md:text-4xl">
              {greeting}
            </h1>
          </div>
          <div className="text-sm text-slate-500">
            {currentUser ? (
              <>
                Signed in as{' '}
                <span className="font-semibold text-slate-700">
                  {currentUser.name}
                </span>
              </>
            ) : (
              'Secure realtime conversations, ready when you are.'
            )}
          </div>
        </header>
        <main className="flex-1">
          {currentUser ? (
            <Chat currentUser={currentUser} onLogout={handleLogout} />
          ) : (
            <Login onLogin={handleLogin} />
          )}
        </main>
      </div>
    </div>
  )
}

export default App

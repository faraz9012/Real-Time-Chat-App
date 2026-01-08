import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { LogOut, Send } from 'lucide-react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'

type AppUser = {
  id: string
  name: string
}

type ChatMessage = {
  id: string
  userId: string
  userName: string
  text: string
  timestamp: number
}

type PresenceUser = {
  id: string
  name: string
  status: 'online' | 'offline'
  lastSeen: number
}

type ChatProps = {
  currentUser: AppUser
  onLogout: () => void
}

type ServerEvent =
  | { type: 'join'; user: AppUser }
  | { type: 'leave'; user: AppUser }
  | { type: 'ping'; user: AppUser }
  | { type: 'chat'; message: ChatMessage }

const OFFLINE_AFTER_MS = 12000
const PING_EVERY_MS = 5000
const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:4000'

const formatTime = (timestamp: number) =>
  new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))

const Chat = ({ currentUser, onLogout }: ChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [users, setUsers] = useState<Record<string, PresenceUser>>({})
  const [text, setText] = useState('')
  const [notice, setNotice] = useState('')
  const [connection, setConnection] = useState<'connecting' | 'connected' | 'offline'>(
    'connecting',
  )
  const wsRef = useRef<WebSocket | null>(null)
  const pingRef = useRef<number | null>(null)
  const cleanupRef = useRef<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const pushMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message])
  }

  const upsertUser = (user: AppUser, status: PresenceUser['status']) => {
    setUsers((prev) => ({
      ...prev,
      [user.id]: {
        id: user.id,
        name: user.name,
        status,
        lastSeen: Date.now(),
      },
    }))
  }

  useEffect(() => {
    let isMounted = true
    const loadUsers = async () => {
      try {
        const response = await fetch('/api/users')
        if (!response.ok) throw new Error('Failed to load users')
        const data = (await response.json()) as AppUser[]
        if (!isMounted) return
        setUsers((prev) => {
          const next: Record<string, PresenceUser> = { ...prev }
          data.forEach((user) => {
            if (!next[user.id]) {
              next[user.id] = {
                id: user.id,
                name: user.name,
                status: 'offline',
                lastSeen: Date.now(),
              }
            }
          })
          return next
        })
      } catch (error) {
        return
      }
    }
    const loadMessages = async () => {
      try {
        const response = await fetch('/api/messages?limit=80')
        if (!response.ok) throw new Error('Failed to load messages')
        const data = (await response.json()) as ChatMessage[]
        if (isMounted) setMessages(data)
      } catch (error) {
        if (isMounted) {
          setNotice('Unable to load message history. Connect the server.')
        }
      }
    }
    loadUsers()
    loadMessages()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const socket = new WebSocket(WS_URL)
    wsRef.current = socket

    const handleClose = () => {
      setConnection('offline')
      if (pingRef.current) window.clearInterval(pingRef.current)
      if (cleanupRef.current) window.clearInterval(cleanupRef.current)
    }

    socket.addEventListener('open', () => {
      setConnection('connected')
      socket.send(JSON.stringify({ type: 'join', user: currentUser }))
      pingRef.current = window.setInterval(() => {
        socket.send(JSON.stringify({ type: 'ping', user: currentUser }))
      }, PING_EVERY_MS)
    })

    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data as string) as ServerEvent
        if (!data || typeof data !== 'object' || !('type' in data)) return
        if (data.type === 'chat') {
          pushMessage(data.message)
          upsertUser(
            { id: data.message.userId, name: data.message.userName },
            'online',
          )
          return
        }
        if (data.type === 'join' || data.type === 'ping') {
          upsertUser(data.user, 'online')
          return
        }
        if (data.type === 'leave') {
          setUsers((prev) => {
            const existing = prev[data.user.id]
            if (!existing) return prev
            return {
              ...prev,
              [data.user.id]: {
                ...existing,
                status: 'offline',
                lastSeen: Date.now(),
              },
            }
          })
        }
      } catch (error) {
        return
      }
    })

    socket.addEventListener('close', handleClose)
    socket.addEventListener('error', handleClose)

    cleanupRef.current = window.setInterval(() => {
      const now = Date.now()
      setUsers((prev) => {
        let changed = false
        const next: Record<string, PresenceUser> = { ...prev }
        Object.values(prev).forEach((user) => {
          if (user.status === 'online' && now - user.lastSeen > OFFLINE_AFTER_MS) {
            next[user.id] = { ...user, status: 'offline' }
            changed = true
          }
        })
        return changed ? next : prev
      })
    }, 4000)

    const handleUnload = () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'leave', user: currentUser }))
      }
    }

    window.addEventListener('beforeunload', handleUnload)

    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      if (pingRef.current) window.clearInterval(pingRef.current)
      if (cleanupRef.current) window.clearInterval(cleanupRef.current)
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'leave', user: currentUser }))
      }
      socket.close()
      wsRef.current = null
    }
  }, [currentUser])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const userList = useMemo(() => {
    const list = Object.values(users)
    if (!list.find((user) => user.id === currentUser.id)) {
      list.push({
        id: currentUser.id,
        name: currentUser.name,
        status: connection === 'connected' ? 'online' : 'offline',
        lastSeen: Date.now(),
      })
    }
    return list.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'online' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [users, currentUser, connection])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    if (trimmed.length > 500) {
      setNotice('Message too long. Keep it under 500 characters.')
      return
    }
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setNotice('Server offline. Start the backend to send messages.')
      return
    }
    setNotice('')
    wsRef.current.send(
      JSON.stringify({ type: 'chat', user: currentUser, text: trimmed }),
    )
    setText('')
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[260px,1fr]">
      <Card className="h-fit">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
              {currentUser.name.slice(0, 2)}
            </div>
            <div>
              <CardTitle className="text-lg">{currentUser.name}</CardTitle>
              <p className="text-sm text-slate-500">
                {connection === 'connected' ? 'Server connected' : 'Server offline'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
            Active users
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {userList.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2 text-sm font-medium"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    user.status === 'online' ? 'bg-emerald-500' : 'bg-rose-400'
                  }`}
                  aria-hidden="true"
                />
                <span>
                  {user.id === currentUser.id ? `${user.name} (you)` : user.name}
                </span>
              </div>
              <Badge variant={user.status === 'online' ? 'success' : 'offline'}>
                {user.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="flex h-full flex-col">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>EchoLine Lounge</CardTitle>
            <p className="text-sm text-slate-500">Real-time messaging with history.</p>
          </div>
          <Button variant="outline" onClick={onLogout} className="w-full md:w-auto">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4">
          <div
            className="flex-1 overflow-y-auto rounded-xl border border-slate-200/70 bg-slate-50/70 p-4"
            role="log"
            aria-live="polite"
          >
            {messages.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-slate-500">
                Start the conversation. Messages will persist on the server.
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => {
                  const isSelf = message.userId === currentUser.id
                  return (
                    <div
                      key={message.id}
                      className={`flex flex-col gap-1 ${
                        isSelf ? 'items-end' : 'items-start'
                      }`}
                    >
                      {isSelf ? null : (
                        <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {message.userName}
                        </p>
                      )}
                      <article
                        className={`w-fit max-w-full rounded-2xl border px-3 py-2 shadow-sm md:max-w-[75%] ${
                          isSelf
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-900'
                        }`}
                      >
                        <p className="break-words text-sm leading-relaxed">
                          {message.text}
                        </p>
                      </article>
                      <p className="px-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex flex-col gap-3 md:flex-row">
              <Input
                type="text"
                placeholder="Write a message..."
                value={text}
                onChange={(event) => setText(event.target.value)}
                aria-label="Write a message"
              />
              <Button type="submit" className="md:w-36">
                <Send className="h-4 w-4" />
                Send
              </Button>
            </div>
            {notice ? <p className="text-sm text-rose-500">{notice}</p> : null}
          </form>
        </CardContent>
      </Card>
    </section>
  )
}

export default Chat

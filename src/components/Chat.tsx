import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import './Chat.css'

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
    <section className="chat">
      <aside className="chat__sidebar">
        <div className="chat__profile">
          <div className="chat__avatar">{currentUser.name.slice(0, 2)}</div>
          <div>
            <p className="chat__name">{currentUser.name}</p>
            <p className="chat__subtle">
              {connection === 'connected' ? 'Server connected' : 'Server offline'}
            </p>
          </div>
        </div>
        <div className="chat__users">
          <h2 className="chat__section-title">Active Users</h2>
          <ul>
            {userList.map((user) => (
              <li key={user.id} className="chat__user">
                <span
                  className={`chat__status chat__status--${user.status}`}
                  aria-hidden="true"
                />
                <span>
                  {user.id === currentUser.id ? `${user.name} (you)` : user.name}
                </span>
                <span className="chat__user-meta">
                  {user.status === 'online' ? 'online' : 'offline'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="chat__panel">
        <div className="chat__header">
          <div>
            <h2>Campus Lounge</h2>
            <p className="chat__subtle">Real-time messaging with timestamps.</p>
          </div>
          <button className="chat__logout" onClick={onLogout} type="button">
            Sign out
          </button>
        </div>

        <div className="chat__messages" role="log" aria-live="polite">
          {messages.length === 0 ? (
            <div className="chat__empty">
              Start the conversation. Messages will persist on the server.
            </div>
          ) : (
            messages.map((message) => (
              <article
                key={message.id}
                className={`message ${
                  message.userId === currentUser.id ? 'message--self' : ''
                }`}
              >
                <header className="message__header">
                  <span className="message__author">
                    {message.userId === currentUser.id ? 'You' : message.userName}
                  </span>
                  <span className="message__time">
                    {formatTime(message.timestamp)}
                  </span>
                </header>
                <p className="message__text">{message.text}</p>
              </article>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat__composer" onSubmit={handleSubmit}>
          <div className="chat__input-group">
            <input
              type="text"
              placeholder="Write a message..."
              value={text}
              onChange={(event) => setText(event.target.value)}
              aria-label="Write a message"
            />
            <button type="submit">Send</button>
          </div>
          {notice ? <p className="chat__notice">{notice}</p> : null}
        </form>
      </div>
    </section>
  )
}

export default Chat

require('dotenv').config()

const http = require('http')
const express = require('express')
const { Server } = require('ws')
const {
  initDb,
  insertMessage,
  getMessages,
  createUser,
  authenticateUser,
} = require('./db.cjs')

const PORT = process.env.PORT || 4000
const app = express()

app.use(express.json())
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.get('/api/messages', async (req, res) => {
  const limitRaw = parseInt(req.query.limit || '80', 10)
  const limit = Number.isNaN(limitRaw) ? 80 : Math.min(Math.max(limitRaw, 10), 200)
  try {
    const messages = await getMessages(limit)
    res.json(messages)
  } catch (error) {
    res.status(500).json({ error: 'Failed to load messages' })
  }
})

app.post('/api/signup', async (req, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const displayName = String(req.body?.displayName || '').trim()
  if (!username || username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters.' })
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' })
  }
  if (!displayName || displayName.length < 2) {
    return res.status(400).json({ error: 'Display name must be at least 2 characters.' })
  }
  try {
    const user = await createUser({ username, password, displayName })
    return res.status(201).json(user)
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username already exists.' })
    }
    return res.status(500).json({ error: 'Failed to create user.' })
  }
})

app.post('/api/login', async (req, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' })
  }
  try {
    const user = await authenticateUser({ username, password })
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' })
    return res.json(user)
  } catch (error) {
    return res.status(500).json({ error: 'Failed to login.' })
  }
})

const server = http.createServer(app)
const wss = new Server({ server })

const createId = () => `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`

const presence = new Map()

const broadcast = (payload) => {
  const message = JSON.stringify(payload)
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message)
    }
  })
}

wss.on('connection', (ws) => {
  ws.on('message', async (data) => {
    let payload
    try {
      payload = JSON.parse(data.toString())
    } catch (error) {
      return
    }

    if (!payload || typeof payload !== 'object' || !payload.type) return

    if (payload.type === 'chat') {
      const user = payload.user || {}
      const text = String(payload.text || '').trim()
      if (!text) return
      const message = {
        id: createId(),
        userId: String(user.id || 'anonymous'),
        userName: String(user.name || 'Anonymous'),
        text: text.slice(0, 500),
        timestamp: Date.now(),
      }
      try {
        await insertMessage(message)
      } catch (error) {
        return
      }
      broadcast({ type: 'chat', message })
      return
    }

    if (payload.type === 'join') {
      const user = payload.user || {}
      const id = String(user.id || '').trim()
      if (!id) return
      const count = (presence.get(id) || 0) + 1
      presence.set(id, count)
      if (count === 1) {
        broadcast({ type: 'join', user })
      }
      ws._userId = id
      return
    }

    if (payload.type === 'ping') {
      broadcast({ type: 'ping', user: payload.user })
      return
    }

    if (payload.type === 'leave') {
      const user = payload.user || {}
      const id = String(user.id || '').trim()
      if (!id) return
      const count = (presence.get(id) || 0) - 1
      if (count <= 0) {
        presence.delete(id)
        broadcast({ type: 'leave', user })
      } else {
        presence.set(id, count)
      }
      ws._left = true
    }
  })

  ws.on('close', () => {
    if (ws._left) return
    const id = ws._userId
    if (!id) return
    const count = (presence.get(id) || 0) - 1
    if (count <= 0) {
      presence.delete(id)
      broadcast({ type: 'leave', user: { id } })
    } else {
      presence.set(id, count)
    }
  })
})

initDb()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Chat server running on http://localhost:${PORT}`)
    })
  })
  .catch((error) => {
    console.error('Failed to start server', error)
    process.exit(1)
  })

const http = require('http')
const express = require('express')
const { Server } = require('ws')
const { initDb, insertMessage, getMessages } = require('./db.cjs')

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

const server = http.createServer(app)
const wss = new Server({ server })

const createId = () => `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`

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

    if (payload.type === 'join' || payload.type === 'leave' || payload.type === 'ping') {
      broadcast({ type: payload.type, user: payload.user })
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

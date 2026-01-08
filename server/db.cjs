const fs = require('fs')
const path = require('path')

const dbPath = path.join(__dirname, 'messages.json')

const ensureDb = () => {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ messages: [] }, null, 2))
  }
}

const readDb = () => {
  ensureDb()
  const raw = fs.readFileSync(dbPath, 'utf8')
  try {
    return JSON.parse(raw)
  } catch (error) {
    return { messages: [] }
  }
}

const writeDb = (data) => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2))
}

const initDb = () => Promise.resolve(ensureDb())

const insertMessage = (message) => {
  const data = readDb()
  data.messages.push(message)
  writeDb(data)
  return Promise.resolve()
}

const getMessages = (limit) => {
  const data = readDb()
  const messages = data.messages || []
  return Promise.resolve(messages.slice(-limit))
}

module.exports = {
  initDb,
  insertMessage,
  getMessages,
}

const mysql = require('mysql2/promise')
const crypto = require('crypto')

let pool

const getPool = () => {
  if (pool) return pool
  const url = process.env.MYSQL_URL
  if (!url) {
    throw new Error('Missing MYSQL_URL in environment')
  }
  pool = mysql.createPool({
    uri: url,
    connectionLimit: 10,
    waitForConnections: true,
  })
  return pool
}

const initDb = async () => {
  const db = getPool()
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(64) NOT NULL UNIQUE,
      display_name VARCHAR(128) NOT NULL,
      password_hash VARCHAR(256) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      user_name VARCHAR(128) NOT NULL,
      \`text\` VARCHAR(500) NOT NULL,
      timestamp BIGINT NOT NULL
    )
  `)
}

const insertMessage = async (message) => {
  const db = getPool()
  await db.query(
    `
      INSERT INTO messages (id, user_id, user_name, \`text\`, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      message.id,
      message.userId,
      message.userName,
      message.text,
      message.timestamp,
    ],
  )
}

const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => {
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
    .toString('hex')
  return `${salt}:${hash}`
}

const verifyPassword = (password, stored) => {
  if (!stored || !stored.includes(':')) return false
  const [salt, hash] = stored.split(':')
  const compare = hashPassword(password, salt).split(':')[1]
  const hashBuf = Buffer.from(hash, 'hex')
  const compareBuf = Buffer.from(compare, 'hex')
  if (hashBuf.length !== compareBuf.length) return false
  return crypto.timingSafeEqual(hashBuf, compareBuf)
}

const createUser = async ({ username, password, displayName }) => {
  const db = getPool()
  const passwordHash = hashPassword(password)
  const [result] = await db.query(
    `
      INSERT INTO users (username, display_name, password_hash)
      VALUES (?, ?, ?)
    `,
    [username, displayName, passwordHash],
  )
  return {
    id: String(result.insertId),
    name: displayName,
  }
}

const getUserByUsername = async (username) => {
  const db = getPool()
  const [rows] = await db.query(
    `
      SELECT id, username, display_name, password_hash
      FROM users
      WHERE username = ?
      LIMIT 1
    `,
    [username],
  )
  return rows[0] || null
}

const authenticateUser = async ({ username, password }) => {
  const user = await getUserByUsername(username)
  if (!user) return null
  if (!verifyPassword(password, user.password_hash)) return null
  return {
    id: String(user.id),
    name: user.display_name,
  }
}

const getMessages = async (limit) => {
  const db = getPool()
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 10), 200) : 80
  const [rows] = await db.query(
    `
      SELECT id, user_id AS userId, user_name AS userName, \`text\`, timestamp
      FROM messages
      ORDER BY timestamp DESC
      LIMIT ?
    `,
    [safeLimit],
  )
  return rows.reverse()
}

module.exports = {
  initDb,
  insertMessage,
  createUser,
  authenticateUser,
  getMessages,
}

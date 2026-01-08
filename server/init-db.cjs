require('dotenv').config()

const { initDb } = require('./db.cjs')

initDb()
  .then(() => {
    console.log('Database initialized')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed to initialize database', error)
    process.exit(1)
  })

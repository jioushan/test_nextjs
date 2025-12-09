
const { Pool, Client } = require('pg')
const { URL } = require('url')

let pool

async function ensureDatabaseExists(connectionString) {
  // Try connecting to the target database first
  try {
    const testClient = new Client({ connectionString })
    await testClient.connect()
    await testClient.end()
    return
  } catch (err) {
    // If database does not exist, Postgres returns code '3D000'
    if (err && err.code === '3D000') {
      // Parse connection string to get DB name and connect to postgres admin DB
      try {
        const url = new URL(connectionString)
        const targetDb = url.pathname ? url.pathname.slice(1) : null
        if (!targetDb) throw err

        // try to connect to 'postgres' database on same server
        url.pathname = '/postgres'
        const adminConn = url.toString()
        const adminClient = new Client({ connectionString: adminConn })
        await adminClient.connect()
        // CREATE DATABASE cannot run inside a transaction; use simple query
        await adminClient.query(`CREATE DATABASE "${targetDb}"`)
        await adminClient.end()
        return
      } catch (innerErr) {
        // rethrow a helpful error
        const e = new Error(
          `Database "${innerErr && innerErr.database ? innerErr.database : 'target'}" does not exist and could not be created: ${innerErr.message}`
        )
        e.original = innerErr
        throw e
      }
    }
    throw err
  }
}

async function getPool() {
  if (pool) return pool
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. See .env.example')
  }

  await ensureDatabaseExists(connectionString)

  pool = new Pool({ connectionString })
  return pool
}

module.exports = { getPool, ensureDatabaseExists }

const { getPool } = require('../../../lib/db')

async function checkReadOnly(pool) {
  // attempt to create and drop a temporary table to check write permission
  const client = await pool.connect()
  try {
    await client.query('CREATE TEMP TABLE tmp_perm_check(id int)')
    await client.query('DROP TABLE tmp_perm_check')
    client.release()
    return false
  } catch (err) {
    client.release()
    // permission denied or read-only user
    return true
  }
}

module.exports = async function handler(req, res) {
  try {
    const pool = await getPool()

    if (req.method === 'GET') {
      const r = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
      const tables = r.rows.map(r => r.tablename)
      const ro = await checkReadOnly(pool)
      return res.status(200).json({ tables, readOnly: ro })
    }

    if (req.method === 'POST') {
      // create simple table with id integer PK and a data JSON column
      const { name } = req.body || {}
      if (!name || !/^[_a-zA-Z0-9]+$/.test(name)) return res.status(400).json({ error: 'invalid name' })
      await pool.query(`CREATE TABLE IF NOT EXISTS ${name} (id integer PRIMARY KEY, data jsonb, created_at TIMESTAMP DEFAULT NOW())`)
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'DELETE') {
      const name = req.query.name
      if (!name) return res.status(400).json({ error: 'name required' })
      await pool.query(`DROP TABLE IF EXISTS ${name}`)
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET,POST,DELETE')
    return res.status(405).end()
  } catch (err) {
    console.error('admin/tables', err)
    return res.status(500).json({ error: err.message })
  }
}

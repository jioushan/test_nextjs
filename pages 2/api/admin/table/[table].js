const { getPool } = require('../../../../lib/db')

// helper to compute columns and return rows
module.exports = async function handler(req, res) {
  const table = req.query.table
  if (!table) return res.status(400).json({ error: 'table required' })

  try {
    const pool = await getPool()

    // validate table name to avoid SQL injection
    if (!/^[A-Za-z0-9_]+$/.test(table)) return res.status(400).json({ error: 'invalid table name' })

    if (req.method === 'GET') {
      const limit = Number(req.query.limit) || 100
      const r = await pool.query(`SELECT * FROM ${table} ORDER BY id ASC LIMIT $1`, [limit])
      const cols = r.fields.map(f => f.name)
      return res.status(200).json({ columns: cols, rows: r.rows })
    }

    if (req.method === 'DELETE') {
      // accept id from body or query string for compatibility with various clients
      const idFromBody = req.body && req.body.id
      const idFromQuery = req.query && req.query.id
      const id = idFromBody !== undefined ? idFromBody : idFromQuery !== undefined ? idFromQuery : undefined
      if (id === undefined) return res.status(400).json({ error: 'id required' })
      const idNum = Number(id)
      if (!Number.isFinite(idNum)) return res.status(400).json({ error: 'invalid id' })
      await pool.query(`DELETE FROM ${table} WHERE id = $1`, [idNum])
      return res.status(200).json({ ok: true })
    }

    // For simplicity we do not implement insert here for admin; user can use public submit endpoint
    res.setHeader('Allow', 'GET,DELETE')
    return res.status(405).end()
  } catch (err) {
    console.error('admin/table', err)
    return res.status(500).json({ error: err.message })
  }
}

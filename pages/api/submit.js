const { getPool } = require('../../lib/db')
// Use the global fetch available in Node 18+ / Next.js runtime
const fetch = globalThis.fetch

function isValidEmail(email) {
  if (!email) return false
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
}

// compute smallest missing positive integer id given sorted ids array
function computeNextIdFromRows(rows) {
  if (!rows || rows.length === 0) return 1
  let expected = 1
  for (const r of rows) {
    const id = r.id
    if (id > expected) return expected
    if (id === expected) expected++
  }
  return expected
}

async function verifyRecaptcha(token, secret) {
  const params = new URLSearchParams()
  params.append('secret', secret)
  params.append('response', token)
  const r = await fetch('https://www.google.com/recaptcha/api/siteverify', { method: 'POST', body: params })
  return r.json()
}

async function verifyTurnstile(token, secret) {
  const params = new URLSearchParams()
  params.append('secret', secret)
  params.append('response', token)
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: params })
  return r.json()
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, telephone, gender, more, email, captchaToken } = req.body || {}

  if (!name) return res.status(400).json({ error: 'name is required' })
  if (email && !isValidEmail(email)) return res.status(400).json({ error: 'invalid email' })

  // verify captcha according to provider
  const provider = process.env.NEXT_PUBLIC_2FA_PROVIDER || process.env.TWO_FA_PROVIDER
  if (!provider) return res.status(500).json({ error: 'captcha provider not configured (NEXT_PUBLIC_2FA_PROVIDER)' })
  if (!captchaToken) return res.status(400).json({ error: 'captchaToken required' })

  try {
    if (provider === 'recaptcha') {
      const secret = process.env.RECAPTCHA_SECRET
      if (!secret) return res.status(500).json({ error: 'RECAPTCHA_SECRET not set' })
      const vr = await verifyRecaptcha(captchaToken, secret)
      if (!vr.success) return res.status(403).json({ error: 'recaptcha failed', detail: vr })
    } else if (provider === 'turnstile') {
      const secret = process.env.TURNSTILE_SECRET
      if (!secret) return res.status(500).json({ error: 'TURNSTILE_SECRET not set' })
      const vr = await verifyTurnstile(captchaToken, secret)
      if (!vr.success) return res.status(403).json({ error: 'turnstile failed', detail: vr })
    } else {
      return res.status(500).json({ error: 'unknown provider' })
    }

    const pool = await getPool()

    // Ensure table exists with integer primary key (not serial) so we can insert explicit ids
    await pool.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id integer PRIMARY KEY,
        name TEXT,
        telephone TEXT,
        gender TEXT,
        email TEXT,
        more TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // Use a transaction with table lock to compute smallest missing id and insert explicitly
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      // lock the target table to prevent concurrent inserts
      await client.query('LOCK TABLE submissions IN EXCLUSIVE MODE')

      const rowsRes = await client.query('SELECT id FROM submissions ORDER BY id ASC')
      const nextId = computeNextIdFromRows(rowsRes.rows)

      await client.query(
        'INSERT INTO submissions(id, name, telephone, gender, email, more) VALUES($1,$2,$3,$4,$5,$6)',
        [nextId, name, telephone || null, gender || null, email || null, more || null]
      )

      await client.query('COMMIT')
    } catch (txErr) {
      await client.query('ROLLBACK')
      throw txErr
    } finally {
      client.release()
    }

    // Per request: do not return submission ID
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('submit error', err)
    if (err && err.original && err.original.code === '3D000') {
      return res.status(500).json({ error: 'Database does not exist and could not be created automatically. Please create the database specified in DATABASE_URL manually.' })
    }
    if (err && err.code === '3D000') {
      return res.status(500).json({ error: 'Database does not exist and could not be created automatically. Please create the database specified in DATABASE_URL manually.' })
    }
    return res.status(500).json({ error: 'Database error', detail: err.message })
  }
}

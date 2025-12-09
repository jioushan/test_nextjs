import { useState } from 'react'

const countries = [
  { code: 'TW', dial: '+886', flag: '🇹🇼', name: 'Taiwan' },
  { code: 'US', dial: '+1', flag: '🇺🇸', name: 'United States' },
  { code: 'CN', dial: '+86', flag: '🇨🇳', name: 'China' },
  { code: 'JP', dial: '+81', flag: '🇯🇵', name: 'Japan' },
  { code: 'HK', dial: '+852', flag: '🇭🇰', name: 'Hong Kong' }
]

export default function Home() {
  const [name, setName] = useState('')
  const [countryIndex, setCountryIndex] = useState(0)
  const [telephoneNumber, setTelephoneNumber] = useState('')
  const [gender, setGender] = useState('男')
  const [more, setMore] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const country = countries[countryIndex]
    const telephone = (country ? country.dial : '') + (telephoneNumber || '')

    // obtain captcha token depending on provider
    const provider = process.env.NEXT_PUBLIC_2FA_PROVIDER || process.env.TWO_FA_PROVIDER
    let captchaToken = null
    if (provider === 'recaptcha' && window.grecaptcha && window.__recaptchaSiteKey) {
      captchaToken = await window.grecaptcha.execute(window.__recaptchaSiteKey, { action: 'submit' })
    } else if (provider === 'turnstile' && window.turnstile) {
      // turnstile widget should set window._turnstile_token via callback; fallback to invoking execute if v0.0 supports
      captchaToken = window._turnstile_token || null
    }

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, telephone, gender, more, email, captchaToken })
      })

      const data = await res.json()
      if (res.ok) {
        setMessage('已儲存 — ID: ' + data.id)
        setName('')
        setTelephoneNumber('')
        setCountryIndex(0)
        setGender('男')
        setMore('')
        setEmail('')
      } else {
        setMessage('錯誤：' + (data.error || data.detail || '未知'))
      }
    } catch (err) {
      setMessage('網路錯誤：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>提交表單</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 10 }}>
          <label>姓名<br />
            <input value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: 8 }} />
          </label>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>電話<br />
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={countryIndex} onChange={(e) => setCountryIndex(Number(e.target.value))} style={{ padding: 8 }}>
                {countries.map((c, i) => (
                  <option key={c.code} value={i}>{c.flag} {c.name} ({c.dial})</option>
                ))}
              </select>
              <input
                value={telephoneNumber}
                onChange={(e) => setTelephoneNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="僅輸入數字"
                style={{ flex: 1, padding: 8 }}
              />
            </div>
          </label>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>電子郵件（選填）<br />
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" style={{ width: '100%', padding: 8 }} />
          </label>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>性別<br />
            <select value={gender} onChange={(e) => setGender(e.target.value)} style={{ width: '100%', padding: 8 }}>
              <option value="男">男</option>
              <option value="女">女</option>
              <option value="其他">其他</option>
            </select>
          </label>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>More<br />
            <textarea value={more} onChange={(e) => setMore(e.target.value)} style={{ width: '100%', padding: 8 }} rows={4} />
          </label>
        </div>

        <div>
          <button type="submit" disabled={loading} style={{ padding: '8px 16px' }}>
            {loading ? '儲存中…' : 'Submit'}
          </button>
        </div>
      </form>

      {message && (
        <div style={{ marginTop: 20, padding: 10, background: '#f6f6f6' }}>{message}</div>
      )}
    </div>
  )
}

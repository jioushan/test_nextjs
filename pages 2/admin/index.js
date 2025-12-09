import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

export default function AdminPage() {
  const [username, setUsername] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [tables, setTables] = useState([])
  const [selected, setSelected] = useState(null)
  const [rows, setRows] = useState([])
  const [cols, setCols] = useState([])
  const [readOnly, setReadOnly] = useState(false)
  const [message, setMessage] = useState(null)
  const [poll, setPoll] = useState(false)
  const [loadingId, setLoadingId] = useState(null)

  useEffect(() => {
    if (loggedIn) fetchTables()
  }, [loggedIn])

  useEffect(() => {
    let id
    if (poll && selected) {
      id = setInterval(() => fetchRows(selected), 3000)
    }
    return () => clearInterval(id)
  }, [poll, selected])

  async function login(e) {
    e.preventDefault()
    if (username === 'admin') {
      setLoggedIn(true)
      localStorage.setItem('admin', '1')
    } else {
      alert('username must be admin')
    }
  }

  async function fetchTables() {
    setMessage(null)
    try {
      const res = await fetch('/api/admin/tables')
      const data = await res.json()
      setTables(data.tables || [])
      setReadOnly(!!data.readOnly)
    } catch (err) {
      console.error('fetchTables error', err)
      setMessage('無法取得表清單：' + (err.message || String(err)))
    }
  }

  async function fetchRows(table) {
    setSelected(table)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/table/${encodeURIComponent(table)}?limit=100`)
      const data = await res.json()
      setCols(data.columns || [])
      setRows(data.rows || [])
    } catch (err) {
      console.error('fetchRows error', err)
      setMessage('無法取得資料列：' + (err.message || String(err)))
      setCols([])
      setRows([])
    }
  }

  function exportCSV() {
    if (!rows.length) return alert('no rows')
    const header = cols.join(',')
    const lines = rows.map(r => cols.map(c => `"${(r[c] ?? '')}"`).join(','))
    const csv = [header, ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selected || 'export'}.csv`
    a.click()
  }

  function exportMarkdown() {
    if (!rows.length) return alert('no rows')
    const header = `| ${cols.join(' | ')} |`
    const sep = `| ${cols.map(() => '---').join(' | ')} |`
    const lines = rows.map(r => `| ${cols.map(c => (r[c] ?? '')).join(' | ')} |`)
    const md = [header, sep, ...lines].join('\n')
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selected || 'export'}.md`
    a.click()
  }

  async function deleteRow(id) {
    if (!confirm('確認刪除此筆？')) return
    setMessage(null)
    setLoadingId(id)
    console.log('deleteRow ->', { table: selected, id })
    try {
      const res = await fetch(`/api/admin/table/${encodeURIComponent(selected)}?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      })
      let d = {}
      try { d = await res.json() } catch (e) { d = {} }
      if (res.ok) {
        await fetchRows(selected)
        setMessage('刪除成功')
      } else {
        const err = d.error || d.detail || 'delete failed'
        console.warn('delete failed', err)
        setMessage(String(err))
        alert(err)
      }
    } catch (err) {
      console.error('deleteRow error', err)
      setMessage('網路或伺服器錯誤：' + (err.message || String(err)))
      alert('網路或伺服器錯誤：' + (err.message || String(err)))
    } finally {
      setLoadingId(null)
    }
  }

  async function createTable() {
    const name = prompt('新表名稱 (只允許英數與底線)')
    if (!name) return
    const res = await fetch('/api/admin/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
    const d = await res.json()
    if (res.ok) fetchTables()
    else alert(d.error || 'create failed')
  }

  async function dropTable() {
    if (!selected) return alert('select a table first')
    if (!confirm('確認刪除整個資料表：' + selected + ' ?')) return
    const res = await fetch(`/api/admin/tables?name=${encodeURIComponent(selected)}`, { method: 'DELETE' })
    const d = await res.json()
    if (res.ok) { setSelected(null); fetchTables() } else alert(d.error || 'drop failed')
  }

  return (
    <div style={{ padding: 20, fontFamily: 'Arial' }}>
      {!loggedIn ? (
        <form onSubmit={login}>
          <label>Username: <input value={username} onChange={(e) => setUsername(e.target.value)} /></label>
          <button type="submit">Login</button>
        </form>
      ) : (
        <div>
          <h2>Admin (no auth) </h2>
          <div style={{ marginBottom: 12 }}>
            <button onClick={fetchTables}>刷新表清單</button>
            <button onClick={createTable} style={{ marginLeft: 8 }}>新增表</button>
            <button onClick={dropTable} style={{ marginLeft: 8 }} disabled={!selected}>刪除表</button>
            <label style={{ marginLeft: 12 }}>ReadOnly: {String(readOnly)}</label>
            <label style={{ marginLeft: 12 }}>Poll: <input type="checkbox" checked={poll} onChange={(e)=> setPoll(e.target.checked)} /></label>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ width: 240 }}>
              <h4>Tables</h4>
              <ul>
                {tables.map(t => (
                  <li key={t}><a href="#" onClick={(e)=>{e.preventDefault(); fetchRows(t)}}>{t}</a></li>
                ))}
              </ul>
            </div>

            <div style={{ flex: 1 }}>
              <h4>Table: {selected || '-'}</h4>
              <div style={{ marginBottom: 8 }}>
                <button onClick={exportCSV} disabled={!rows.length}>Export CSV</button>
                <button onClick={exportMarkdown} style={{ marginLeft: 8 }} disabled={!rows.length}>Export Markdown</button>
              </div>

              <div style={{ maxHeight: 400, overflow: 'auto', border: '1px solid #ddd' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {cols.map(c => <th key={c} style={{ border: '1px solid #eee', padding: 6 }}>{c}</th>)}
                      <th style={{ border: '1px solid #eee', padding: 6 }}>_</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.id}>
                        {cols.map(c => <td key={c} style={{ border: '1px solid #eee', padding: 6 }}>{String(r[c] ?? '')}</td>)}
                        <td style={{ border: '1px solid #eee', padding: 6 }}>{!readOnly && <button onClick={() => deleteRow(r.id)}>Del</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

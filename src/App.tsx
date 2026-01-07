import { useState } from 'react'
import './App.css'

function App() {
  const [data, setData] = useState<string>('No data')
  const API_URL = 'http://localhost:3000'

  const handleFetch = async (url: string, options?: RequestInit) => {
    try {
      setData('Loading...')
      const res = await fetch(url, options)
      const text = await res.text()
      try {
        const json = JSON.parse(text)
        setData(JSON.stringify(json, null, 2))
      } catch {
        setData(text)
      }
    } catch (err: any) {
      setData(`Error: ${err.message}`)
    }
  }

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    const formData = new FormData()
    formData.append('file', e.target.files[0])
    
    handleFetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData
    })
  }

  return (
    <div>
      <h1>Frontend Server</h1>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => handleFetch(`${API_URL}/`)}>Get Home (/)</button>
        <button onClick={() => handleFetch(`${API_URL}/users`)}>Get Users (/users)</button>
        <button onClick={() => handleFetch(`${API_URL}/users`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name: 'New User ' + Date.now(), email: `user${Date.now()}@example.com` })
        })}>Create User (POST /users)</button>
        
        <div style={{ display: 'inline-block', marginLeft: '10px' }}>
            <label>Upload File: </label>
            <input type="file" onChange={uploadFile} />
        </div>
      </div>
      
      <h3>Response:</h3>
      <pre>{data}</pre>
    </div>
  )
}

export default App

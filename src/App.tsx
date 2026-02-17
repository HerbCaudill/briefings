import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'

interface Briefing {
  date: string
  title: string
}

function App() {
  const [briefings, setBriefings] = useState<Briefing[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    fetch('/briefings/index.json')
      .then(r => r.json())
      .then((data: Briefing[]) => {
        setBriefings(data)
        if (data.length > 0) setSelected(data[0].date)
      })
  }, [])

  useEffect(() => {
    if (!selected) return
    fetch(`/briefings/${selected}.md`)
      .then(r => r.text())
      .then(setContent)
  }, [selected])

  const formatDate = (date: string) => {
    const d = new Date(date + 'T12:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="layout">
      <button className="menu-toggle" onClick={() => setNavOpen(!navOpen)}>
        ☰
      </button>
      <nav className={`sidebar ${navOpen ? 'open' : ''}`}>
        <h2>Briefings</h2>
        <ul>
          {briefings.map(b => (
            <li key={b.date}>
              <button
                className={selected === b.date ? 'active' : ''}
                onClick={() => { setSelected(b.date); setNavOpen(false) }}
              >
                {formatDate(b.date)}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {navOpen && <div className="overlay" onClick={() => setNavOpen(false)} />}
      <main className="content">
        <article>
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      </main>
    </div>
  )
}

export default App

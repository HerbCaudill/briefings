import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'

function App() {
  const [briefings, setBriefings] = useState<Briefing[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [content, setContent] = useState('')

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

  const formatFullDate = (date: string) => {
    const d = new Date(date + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="min-h-screen flex justify-center px-8 pt-12 pb-16 max-md:px-5 max-md:pt-8 max-md:pb-12">
      <article className="max-w-180 w-full">
        <h1 className="font-serif text-3xl font-bold leading-tight mb-1 pt-3 border-t-4 border-gray-900">
          Daily briefing
        </h1>
        {selected && (
          <select
            className="font-sans text-base text-gray-500 mb-8"
            value={selected}
            onChange={e => setSelected(e.target.value)}
          >
            {briefings.map(b => (
              <option key={b.date} value={b.date}>
                {formatFullDate(b.date)}
              </option>
            ))}
          </select>
        )}
        <ReactMarkdown>{content}</ReactMarkdown>
      </article>
    </div>
  )
}

export default App

type Briefing = {
  date: string
  title: string
}

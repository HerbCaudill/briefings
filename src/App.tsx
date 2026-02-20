import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'

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

  const formatFullDate = (date: string) => {
    const d = new Date(date + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="flex min-h-screen">
      <button
        className="hidden max-md:block fixed top-4 left-4 z-20 bg-white border border-gray-200 rounded px-3 py-2 text-xl cursor-pointer shadow-sm"
        onClick={() => setNavOpen(!navOpen)}
      >
        ☰
      </button>
      <nav
        className={`w-60 bg-gray-50 border-r border-gray-200 px-5 py-8 fixed top-0 left-0 h-screen overflow-y-auto z-10 max-md:bg-white max-md:shadow-lg max-md:transition-transform max-md:duration-250 max-md:ease-out ${navOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}`}
      >
        <h2 className="font-sans text-[0.8rem] font-semibold uppercase tracking-widest text-gray-500 mb-3 pb-3 pt-3 border-t-3 border-gray-900">
          Briefings
        </h2>
        <ul className="list-none">
          {briefings.map(b => (
            <li key={b.date} className="mt-0.5 first:mt-0">
              <button
                className={`bg-transparent border-none font-mono text-[0.85rem] cursor-pointer px-2.5 py-1.5 rounded-sm w-full text-left transition-colors duration-150 ${
                  selected === b.date
                    ? 'text-gray-900 bg-black/6 font-medium'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-black/4'
                }`}
                onClick={() => { setSelected(b.date); setNavOpen(false) }}
              >
                {formatDate(b.date)}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {navOpen && (
        <div
          className="max-md:fixed max-md:inset-0 max-md:bg-black/25 max-md:z-5 hidden max-md:block"
          onClick={() => setNavOpen(false)}
        />
      )}
      <main className="ml-60 max-md:ml-0 flex-1 flex justify-center px-8 pt-12 pb-16 max-md:px-5 max-md:pt-14 max-md:pb-12">
        <article className="max-w-180 w-full">
          {selected && (
            <>
              <h1 className="font-sans text-3xl font-bold leading-tight mb-1 pt-3 border-t-4 border-gray-900">
                Daily briefing
              </h1>
              <p className="font-sans text-base text-gray-500 mb-8">
                {formatFullDate(selected)}
              </p>
            </>
          )}
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      </main>
    </div>
  )
}

export default App

type Briefing = {
  date: string
  title: string
}

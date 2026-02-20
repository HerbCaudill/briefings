import { useEffect, useMemo, useState } from "react"
import ReactMarkdown from "react-markdown"
import { IconChevronDown } from "@tabler/icons-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import "./App.css"

function App() {
  const [briefings, setBriefings] = useState<Briefing[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [content, setContent] = useState("")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch("/briefings/index.json")
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

  const availableDates = useMemo(() => new Set(briefings.map(b => b.date)), [briefings])

  const selectedDate = selected ? parseDate(selected) : undefined

  return (
    <div className="min-h-screen flex justify-center px-8 pt-12 pb-16 max-md:px-5 max-md:pt-8 max-md:pb-12">
      <article className="max-w-180 w-full">
        <h1>Daily briefing</h1>
        {selected && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger className="group font-mono font-extrabold text-xs mb-8 flex items-center gap-1 cursor-pointer focus:outline-none">
              {formatFullDate(selected)}
              <IconChevronDown
                size={14}
                stroke={2.5}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={day => {
                  if (day) {
                    setSelected(toISODate(day))
                    setOpen(false)
                  }
                }}
                disabled={date => !availableDates.has(toISODate(date))}
                defaultMonth={selectedDate}
              />
            </PopoverContent>
          </Popover>
        )}
        <h2>News</h2>

        <ReactMarkdown>{content}</ReactMarkdown>
      </article>
    </div>
  )
}

/** Format an ISO date string as a full readable date. */
const formatFullDate = (date: string) => {
  const d = new Date(date + "T12:00:00")
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

/** Parse an ISO date string (YYYY-MM-DD) into a Date at noon local time. */
const parseDate = (iso: string) => new Date(iso + "T12:00:00")

/** Convert a Date to an ISO date string (YYYY-MM-DD). */
const toISODate = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export default App

type Briefing = {
  date: string
  title: string
}

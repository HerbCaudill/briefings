import { useCallback, useEffect, useMemo, useState } from "react"
import { IconChevronDown } from "@tabler/icons-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

function App() {
  const [briefings, setBriefings] = useState<BriefingIndex[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [content, setContent] = useState<Briefing | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch("/briefings/index.json")
      .then(r => r.json())
      .then((data: BriefingIndex[]) => {
        setBriefings(data)
        if (data.length > 0) setSelected(data[0].date)
      })
  }, [])

  useEffect(() => {
    if (!selected) return
    fetch(`/briefings/${selected}.json`)
      .then(r => r.json())
      .then(setContent)
  }, [selected])

  const availableDates = useMemo(() => new Set(briefings.map(b => b.date)), [briefings])

  const selectedDate = selected ? parseDate(selected) : undefined

  const selectedIndex = briefings.findIndex(b => b.date === selected)

  const goToToday = useCallback(() => {
    const today = toISODate(new Date())
    if (availableDates.has(today)) setSelected(today)
  }, [availableDates])

  const goToPrev = useCallback(() => {
    if (selectedIndex < briefings.length - 1) setSelected(briefings[selectedIndex + 1].date)
  }, [selectedIndex, briefings])

  const goToNext = useCallback(() => {
    if (selectedIndex > 0) setSelected(briefings[selectedIndex - 1].date)
  }, [selectedIndex, briefings])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return
      if (e.key === "d") {
        e.preventDefault()
        goToToday()
      } else if (e.key === "p") {
        e.preventDefault()
        goToPrev()
      } else if (e.key === "n") {
        e.preventDefault()
        goToNext()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [goToToday, goToPrev, goToNext])

  return (
    <div className="min-h-screen flex justify-center px-8 pt-12 pb-16 max-md:px-5 max-md:pt-8 max-md:pb-12">
      <article className="max-w-180 w-full">
        <h1 className="font-serif text-3xl font-bold leading-tight mb-1 pt-3 border-t-4 border-accent text-accent">
          Daily briefing
        </h1>
        {selected && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger className="group font-sans font-extrabold text-xs mb-8 flex items-center gap-1 cursor-pointer focus:outline-none">
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
        <h2 className="font-sans text-xl font-semibold mt-10 mb-4 pt-3 border-t border-accent text-accent">
          News
        </h2>
        {content?.sections.map(section => (
          <section key={section.title}>
            <h3 className="font-bold leading-snug text-sm my-3">{section.title}</h3>
            {section.stories.map(story => (
              <div key={story.headline}>
                <h4>{story.headline}</h4>
                <p className="font-mono font-normal text-xs leading-snug text-gray-700 mb-1">
                  {story.body}
                </p>
                <div className="flex gap-0 mb-4">
                  {story.sources.map((source, i) => (
                    <a
                      key={source.url}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "font-sans text-xs text-gray-400 no-underline px-2 border-r border-gray-300 leading-none transition-colors duration-150 hover:text-gray-600",
                        i === 0 && "pl-0",
                        i === story.sources.length - 1 && "border-r-0",
                      )}
                    >
                      {source.name}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}
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

type BriefingIndex = {
  date: string
  title: string
}

type Source = {
  name: string
  url: string
}

type Story = {
  headline: string
  body: string
  sources: Source[]
}

type Section = {
  title: string
  stories: Story[]
}

type Briefing = {
  sections: Section[]
}

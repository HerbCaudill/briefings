import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { IconChevronDown } from "@tabler/icons-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/** Read the date from the URL path (e.g. /2026-03-30). */
const getDateFromPath = () => {
  const match = window.location.pathname.match(/^\/(\d{4}-\d{2}-\d{2})$/)
  return match ? match[1] : null
}

function App() {
  const [briefings, setBriefings] = useState<BriefingIndex[]>([])
  const [selected, setSelected] = useState<string | null>(getDateFromPath)
  const [content, setContent] = useState<Briefing | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch("/briefings/index.json")
      .then(r => r.json())
      .then((data: BriefingIndex[]) => {
        setBriefings(data)
        const fromUrl = getDateFromPath()
        if (fromUrl && data.some(b => b.date === fromUrl)) setSelected(fromUrl)
        else if (data.length > 0) setSelected(data[0].date)
      })
  }, [])

  /** Push the selected date into the URL so back/forward navigation works. */
  useEffect(() => {
    if (!selected) return
    const path = `/${selected}`
    if (window.location.pathname !== path) window.history.pushState(null, "", path)
  }, [selected])

  /** Listen for browser back/forward navigation. */
  useEffect(() => {
    const onPopState = () => {
      const date = getDateFromPath()
      if (date) setSelected(date)
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
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

  /** Track the starting point of a touch to detect horizontal swipes. */
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
  }, [])

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStart.current
      if (!start) return
      touchStart.current = null
      const touch = e.changedTouches[0]
      const dx = touch.clientX - start.x
      const dy = touch.clientY - start.y
      // Require a mostly-horizontal swipe past a minimum distance.
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
      if (dx < 0) goToNext()
      else goToPrev()
    },
    [goToNext, goToPrev],
  )

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
    <div
      className="flex min-h-screen justify-center px-8 pt-12 pb-16 max-md:px-5 max-md:pt-8 max-md:pb-12"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <article className="w-full max-w-180">
        <h1 className="border-accent text-accent mb-1 border-t-4 pt-3 font-serif text-3xl leading-tight font-bold">
          Daily briefing
        </h1>
        {selected && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger className="group mb-8 flex cursor-pointer items-center gap-1 font-sans text-xs font-extrabold focus:outline-none">
              {formatFullDate(selected)}
              <IconChevronDown
                size={14}
                stroke={2.5}
                className="opacity-0 transition-opacity group-hover:opacity-100"
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
        <h2 className="border-accent text-accent mt-10 mb-4 border-t pt-3 font-sans text-xl font-semibold">
          News
        </h2>
        {content?.sections.map(section => (
          <section key={section.title}>
            <h3 className="my-3 text-sm leading-snug font-bold">{section.title}</h3>
            {section.stories.map(story => (
              <div key={story.headline}>
                <h4 className="leading-tight">{story.headline}</h4>
                <p className="mb-1 font-mono text-xs leading-snug font-normal text-gray-700">
                  {story.body}
                </p>
                <div className="mb-4 flex gap-0">
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

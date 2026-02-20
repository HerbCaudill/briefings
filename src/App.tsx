import { useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import { IconChevronDown } from "@tabler/icons-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import "./App.css"

function App() {
  const [briefings, setBriefings] = useState<Briefing[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [content, setContent] = useState("")

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

  return (
    <div className="min-h-screen flex justify-center px-8 pt-12 pb-16 max-md:px-5 max-md:pt-8 max-md:pb-12">
      <article className="max-w-180 w-full">
        <h1>Daily briefing</h1>
        {selected && (
          <DropdownMenu>
            <DropdownMenuTrigger className="font-mono font-extrabold text-xs mb-8 flex items-center gap-1 cursor-pointer focus:outline-none">
              {formatFullDate(selected)}
              <IconChevronDown size={14} stroke={2.5} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuRadioGroup value={selected} onValueChange={setSelected}>
                {briefings.map(b => (
                  <DropdownMenuRadioItem key={b.date} value={b.date} className="font-mono text-xs">
                    {formatFullDate(b.date)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
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

export default App

type Briefing = {
  date: string
  title: string
}

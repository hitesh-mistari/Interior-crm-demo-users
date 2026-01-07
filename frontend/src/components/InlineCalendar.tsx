import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface InlineCalendarProps {
  value?: string
  onPick: (value: string) => void
  minDate?: string // ISO format YYYY-MM-DD
  maxDate?: string // ISO format YYYY-MM-DD
}

const toIsoDate = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export default function InlineCalendar({ value, onPick, minDate, maxDate }: InlineCalendarProps) {
  const initial = value ? new Date(value) : new Date()
  const [cursor, setCursor] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1))

  const grid = useMemo(() => {
    const firstDayIdx = ((cursor.getDay() + 6) % 7) // Monday=0
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
    const cells: Array<{ date?: Date; label?: number }> = []
    for (let i = 0; i < firstDayIdx; i++) cells.push({})
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), d), label: d })
    }
    while (cells.length % 7 !== 0) cells.push({})
    if (cells.length < 42) {
      for (let i = cells.length; i < 42; i++) cells.push({})
    }
    return cells
  }, [cursor])

  const selected = value ? new Date(value) : null

  const monthLabel = `${cursor.toLocaleString('en-US', { month: 'long' })} ${cursor.getFullYear()}`

  const isDateDisabled = (date?: Date) => {
    if (!date) return true
    const iso = toIsoDate(date)
    if (minDate && iso < minDate) return true
    if (maxDate && iso > maxDate) return true
    return false
  }

  return (
    <div className="w-[280px] bg-white border border-slate-300 rounded-xl shadow-xl p-3" style={{ animation: 'slideUp 140ms ease-out both' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-slate-800">{monthLabel}</div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w) => (
          <div key={w} className="text-[11px] text-slate-500 text-center">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.map((c, i) => {
          const disabled = isDateDisabled(c.date)
          return (
            <button
              key={i}
              disabled={disabled || !c.date}
              onClick={() => c.date && onPick(toIsoDate(c.date))}
              className={`h-8 rounded border text-sm ${!c.date ? 'opacity-0 cursor-default' : ''} 
                ${selected && c.date && toIsoDate(selected) === toIsoDate(c.date)
                  ? 'bg-slate-800 text-white border-slate-800'
                  : disabled
                    ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                    : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-50'}`}
            >
              {c.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}


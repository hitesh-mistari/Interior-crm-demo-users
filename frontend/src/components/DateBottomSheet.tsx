import { useMemo, useState } from 'react';
import { CalendarDays, Clock, X } from 'lucide-react';
import useEscapeKey from '../hooks/useEscapeKey';

interface DateBottomSheetProps {
  open: boolean;
  value?: string;
  onClose: () => void;
  onSave: (value: string) => void;
  minDate?: string; // ISO format YYYY-MM-DD
  maxDate?: string; // ISO format YYYY-MM-DD
}

export default function DateBottomSheet({ open, value, onClose, onSave, minDate, maxDate }: DateBottomSheetProps) {
  useEscapeKey(onClose, open);
  const startDate = value && value.match(/^\d{4}-\d{2}-\d{2}/) ? value : undefined;
  const initial = startDate ? new Date(startDate) : new Date();
  const [cursor, setCursor] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const [selected, setSelected] = useState<Date | null>(startDate ? new Date(startDate) : null);
  const [time, setTime] = useState('');

  const toIsoDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const isDateDisabled = (d: Date) => {
    const iso = toIsoDate(d);
    if (minDate && iso < minDate) return true;
    if (maxDate && iso > maxDate) return true;
    return false;
  };

  const monthDays = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: Array<{ label: string; date?: Date }> = [];
    for (let i = 0; i < firstDay; i++) cells.push({ label: '' });
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ label: String(d), date: new Date(y, m, d) });
    }
    return cells;
  }, [cursor]);

  const pickQuick = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    if (isDateDisabled(d)) return;
    setSelected(d);
    setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  const pickWeekend = () => {
    const d = new Date();
    const day = d.getDay();
    const toSat = (6 - day + 7) % 7 || 7; // next Saturday
    d.setDate(d.getDate() + toSat);
    if (isDateDisabled(d)) return;
    setSelected(d);
    setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  const pickNextWeek = () => pickQuick(7);

  const save = () => {
    if (!selected) return onClose();
    if (isDateDisabled(selected)) return;
    const base = toIsoDate(selected);
    onSave(base);
    onClose();
  };

  if (!open) return null;

  const isQuickDisabled = (days: number) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return isDateDisabled(d);
  };

  const isWeekendDisabled = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const toSat = (6 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + toSat);
    return isDateDisabled(d);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex md:items-center items-end justify-center md:p-4 z-[9999] animate-in fade-in duration-200 !mt-0">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-white w-full max-w-[360px] md:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col relative z-10 animate-in slide-in-from-bottom duration-300 md:slide-in-from-bottom-10">

        {/* Mobile Drag Handle */}
        <div className="md:hidden w-full flex items-center justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">Select Date</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={isQuickDisabled(0)}
              onClick={() => pickQuick(0)}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${isQuickDisabled(0) ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
            >
              <CalendarDays className="w-4 h-4" /> Today
            </button>
            <button
              disabled={isQuickDisabled(1)}
              onClick={() => pickQuick(1)}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${isQuickDisabled(1) ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
            >
              <CalendarDays className="w-4 h-4" /> Tomorrow
            </button>
            <button
              disabled={isWeekendDisabled()}
              onClick={pickWeekend}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${isWeekendDisabled() ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
            >
              <CalendarDays className="w-4 h-4" /> This weekend
            </button>
            <button
              disabled={isQuickDisabled(7)}
              onClick={pickNextWeek}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${isQuickDisabled(7) ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
            >
              <CalendarDays className="w-4 h-4" /> Next week
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-slate-800">{cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
              <div className="flex items-center gap-1">
                <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">◀</button>
                <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">▶</button>
              </div>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((c, i) => {
                const disabled = c.date ? isDateDisabled(c.date) : true;
                return (
                  <button
                    key={i}
                    disabled={disabled || !c.date}
                    onClick={() => c.date && setSelected(c.date)}
                    className={`h-9 w-9 mx-auto rounded-full flex items-center justify-center text-sm transition-all ${selected && c.date && toIsoDate(selected) === toIsoDate(c.date)
                      ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                      : !c.date
                        ? 'opacity-0 cursor-default'
                        : disabled
                          ? 'text-slate-200 cursor-not-allowed'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 hidden">
            {/* Time picker hidden for now as unused in logic explicitly, preserved in state */}
            <Clock className="w-4 h-4 text-slate-400" />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="px-2 py-1 rounded bg-slate-50 border border-slate-200 text-slate-700 text-sm outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
        </div>

        <div className="p-6 pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <button onClick={save} className="w-full px-6 py-3 rounded-xl bg-slate-900 text-white text-base font-medium shadow-lg shadow-slate-900/20 hover:bg-slate-800 active:scale-95 transition-all">
            Apply Date
          </button>
        </div>
      </div>
    </div>
  );
}

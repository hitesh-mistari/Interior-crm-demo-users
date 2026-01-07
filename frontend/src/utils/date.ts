export const toIsoMinute = (d: Date = new Date()): string => {
  // Returns YYYY-MM-DDTHH:MM (ISO minute precision)
  return d.toISOString().slice(0, 16);
};

export const normalizeToIsoMinute = (input?: string): string => {
  // Accepts date-only (YYYY-MM-DD), ISO with time, or other parseable strings
  if (!input) return toIsoMinute();
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
  const isoMinute = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
  if (dateOnly.test(input)) return `${input}T00:00`;
  if (isoMinute.test(input)) return input.slice(0, 16);
  const d = new Date(input);
  if (!isNaN(d.getTime())) return toIsoMinute(d);
  // Fallback to now if parsing fails
  return toIsoMinute();
};

export const isFuture = (isoMinuteString: string): boolean => {
  const d = new Date(isoMinuteString);
  return d.getTime() > Date.now();
};

export const isPast = (isoMinuteString: string): boolean => {
  const d = new Date(isoMinuteString);
  return d.getTime() < Date.now();
};

export const formatYMDHM = (input: string): string => {
  const d = new Date(input);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
};


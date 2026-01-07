import React, { useEffect, useRef, useState } from 'react';

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  allowNegative?: boolean;
  antiAutofill?: boolean;
}

// Format a numeric string (digits only, optional '-') using Indian grouping
function formatIndian(raw: string): string {
  if (!raw) return '';
  const isNegative = raw.startsWith('-');
  const digits = isNegative ? raw.slice(1) : raw;
  if (!/^[0-9]+$/.test(digits)) return (isNegative ? '-' : '') + digits.replace(/[^0-9]/g, '');
  // Remove leading zeros but keep a single zero if that's the value
  const normalized = digits.replace(/^0+(?=\d)/, '') || '0';
  if (normalized.length <= 3) return (isNegative ? '-' : '') + normalized;
  const last3 = normalized.slice(-3);
  const rest = normalized.slice(0, -3);
  const groups: string[] = [];
  for (let i = rest.length; i > 0; i -= 2) {
    const start = Math.max(i - 2, 0);
    groups.unshift(rest.slice(start, i));
  }
  return (isNegative ? '-' : '') + groups.join(',') + ',' + last3;
}

// Strip everything except digits and optional leading '-'
// FIX: If input contains a decimal, truncate it to avoid "100.00" -> "10000"
function sanitizeToRaw(input: string, allowNegative: boolean): string {
  let s = String(input || '');
  if (s.indexOf('.') !== -1) {
    s = s.split('.')[0];
  }
  s = s.replace(/,/g, '');
  // Keep only digits; optionally keep one leading '-'
  if (allowNegative) {
    const isNeg = s.trim().startsWith('-');
    s = s.replace(/[^0-9]/g, '');
    s = (isNeg ? '-' : '') + s;
  } else {
    s = s.replace(/[^0-9]/g, '');
  }
  return s;
}

// Convert display string (with commas and optional '-') to numeric value
function displayToNumber(display: string, allowNegative: boolean): number | null {
  const raw = sanitizeToRaw(display, allowNegative);
  if (!raw || raw === '-') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// Compute caret position that preserves digits to the right of the cursor
function computeNextCaret(display: string, digitsRight: number): number {
  if (digitsRight <= 0) return display.length;
  // Count digits from the end and stop when we matched digitsRight
  let count = 0;
  for (let i = display.length - 1; i >= 0; i--) {
    if (/\d/.test(display[i])) {
      count++;
      if (count === digitsRight) return i + 1; // place cursor just after this digit
    }
  }
  return display.length;
}

export default function NumericInput({ value, onChange, allowNegative = false, antiAutofill = true, className, placeholder, ...rest }: NumericInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [display, setDisplay] = useState<string>('');
  const [nameAttr] = useState<string>(() => `num_${Math.random().toString(36).slice(2)}`);

  // Sync external numeric value into formatted display
  useEffect(() => {
    if (value === null || value === undefined) {
      setDisplay('');
    } else {
      const raw = String(value);
      // We process raw to ensure we don't display decimals if they come from backend inadvertently
      const sanitized = sanitizeToRaw(raw, allowNegative);
      setDisplay(formatIndian(sanitized));
    }
  }, [value, allowNegative]);

  // Handle typing with live formatting and caret preservation
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const prev = display;
    const prevCursor = el.selectionStart ?? prev.length;

    // Determine how many digits are to the right of the cursor in the previous display
    const prevRightDigits = prev.slice(prevCursor).replace(/[^0-9]/g, '').length;

    const raw = sanitizeToRaw(el.value, allowNegative);
    // Prevent leading zeros beyond a single zero
    const normalized = raw.replace(/^(?:-)?0+(?=\d)/, raw.startsWith('-') ? '-' : '');
    const nextDisplay = formatIndian(normalized);
    setDisplay(nextDisplay);
    const nextNumeric = displayToNumber(nextDisplay, allowNegative);
    onChange(nextNumeric);

    // Restore caret to a logical position
    requestAnimationFrame(() => {
      const node = inputRef.current;
      if (!node) return;
      const nextPos = computeNextCaret(nextDisplay, prevRightDigits);
      try {
        node.setSelectionRange(nextPos, nextPos);
      } catch { }
    });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const raw = sanitizeToRaw(text, allowNegative);
    const nextDisplay = formatIndian(raw);
    setDisplay(nextDisplay);
    const nextNumeric = displayToNumber(nextDisplay, allowNegative);
    onChange(nextNumeric);
    requestAnimationFrame(() => {
      const node = inputRef.current;
      if (!node) return;
      const pos = nextDisplay.length;
      try { node.setSelectionRange(pos, pos); } catch { }
    });
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      onPaste={handlePaste}
      onFocus={(e) => { if (antiAutofill) { try { (e.currentTarget as HTMLInputElement).readOnly = false; } catch { } } }}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      aria-autocomplete="none"
      readOnly={antiAutofill}
      name={nameAttr}
      {...rest}
    />
  );
}

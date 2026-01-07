import { useState, useEffect } from 'react';

interface EditableCellProps {
  value: string | number;
  onChange: (value: string) => void;
  isEditing: boolean;
  className?: string;
  type?: string;
}

export default function EditableCell({ value, onChange, isEditing, className, type = 'text' }: EditableCellProps) {
  const [currentValue, setCurrentValue] = useState(String(value));

  useEffect(() => {
    setCurrentValue(String(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentValue(e.target.value);
    onChange(e.target.value);
  };

  if (isEditing) {
    return (
      <input
        type={type}
        value={currentValue}
        onChange={handleChange}
        autoFocus
        className={`w-full px-2 py-1 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none ${className}`}
      />
    );
  }

  return (
    <div className={`truncate ${className}`}>
      {currentValue}
    </div>
  );
}

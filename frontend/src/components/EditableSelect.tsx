import React, { useState, useEffect } from 'react';

interface EditableSelectProps {
  value: string;
  onChange: (value: string) => void;
  isEditing: boolean;
  options: { value: string; label: string }[];
}

const EditableSelect: React.FC<EditableSelectProps> = ({ value, onChange, isEditing, options }) => {
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentValue(e.target.value);
    onChange(e.target.value);
  };

  return (
    <div>
      {isEditing ? (
        <select
          value={currentValue}
          onChange={handleChange}
          autoFocus
          className="w-full px-2 py-1 border rounded-md"
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="px-2 py-1">{options.find(o => o.value === value)?.label || value}</div>
      )}
    </div>
  );
};

export default EditableSelect;

import { useState, useRef, useEffect } from 'react';
import type { MultiSelectDropdownProps } from '../types/component.types';

export function MultiSelectDropdown({
  label,
  error,
  required,
  helpText,
  options,
  selectedValues,
  onChange,
  placeholder = 'Select...',
  disabled = false,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fieldId = `field-${label.toLowerCase().replace(/\s+/g, '-')}`;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (value: number) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const selectedLabels = options
    .filter(o => selectedValues.includes(o.value))
    .map(o => o.label);

  const displayText = selectedLabels.length > 0
    ? `${selectedLabels.length} selected`
    : placeholder;

  const triggerClass = `multiselect__trigger${selectedLabels.length === 0 ? ' multiselect__trigger--placeholder' : ''}`;

  return (
    <div className={`form-field ${error ? 'has-error' : ''}`} ref={containerRef}>
      <label htmlFor={fieldId}>
        {label}
        {required && <span className="required">*</span>}
      </label>
      <div className="multiselect">
        <button
          type="button"
          id={fieldId}
          className={triggerClass}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          {displayText}
        </button>
        {isOpen && (
          <div className="multiselect__dropdown">
            {options.map(opt => (
              <label
                key={opt.value}
                className={`multiselect__option${selectedValues.includes(opt.value) ? ' multiselect__option--selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(opt.value)}
                  onChange={() => toggleOption(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        )}
      </div>
      {selectedLabels.length > 0 && (
        <div className="multiselect__tags">
          {selectedLabels.map(lbl => (
            <span key={lbl} className="multiselect__tag">{lbl}</span>
          ))}
        </div>
      )}
      {helpText && <span className="help-text">{helpText}</span>}
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}

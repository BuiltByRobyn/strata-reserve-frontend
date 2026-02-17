import { useState, useRef, useEffect } from 'react';
import type { SingleSelectDropdownProps } from '../types/component.types';

export function SingleSelectDropdown({
  label,
  error,
  required,
  helpText,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
}: SingleSelectDropdownProps) {
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

  const selectedOption = options.find(o => String(o.value) === String(value));
  const displayText = selectedOption ? selectedOption.label : placeholder;
  const hasValue = !!selectedOption;

  const triggerClass = `multiselect__trigger${!hasValue ? ' multiselect__trigger--placeholder' : ''}`;

  return (
    <div className={`form-field ${error ? 'has-error' : ''}`} ref={containerRef}>
      {label && (
        <label htmlFor={fieldId}>
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
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
            {placeholder && (
              <div
                className={`multiselect__option${!hasValue ? ' multiselect__option--selected' : ''}`}
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
              >
                {placeholder}
              </div>
            )}
            {options.map(opt => (
              <div
                key={opt.value}
                className={`multiselect__option${String(opt.value) === String(value) ? ' multiselect__option--selected' : ''}`}
                onClick={() => {
                  onChange(String(opt.value));
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>
      {helpText && <span className="help-text">{helpText}</span>}
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}

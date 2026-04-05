import { useState, useRef, useCallback, useLayoutEffect } from 'react';
import type { MultiSelectDropdownProps } from '../types/component.types';
import { useClickOutside } from '../hooks/useClickOutside';

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
  searchable = false,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const savedScrollTop = useRef<number | null>(null);
  const fieldId = `field-${label.toLowerCase().replace(/\s+/g, '-')}`;

  useClickOutside(containerRef, useCallback(() => { setIsOpen(false); setSearch(''); }, []));

  useLayoutEffect(() => {
    if (savedScrollTop.current != null && dropdownRef.current) {
      dropdownRef.current.scrollTop = savedScrollTop.current;
      savedScrollTop.current = null;
    }
  });

  const toggleOption = (value: number) => {
    if (dropdownRef.current) {
      savedScrollTop.current = dropdownRef.current.scrollTop;
    }
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const filteredOptions = searchable && search
    ? options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const selectedCount = selectedValues.length;
  const displayText = selectedCount > 0 ? `${selectedCount} selected` : placeholder;
  const triggerClass = `multiselect__trigger${selectedCount === 0 ? ' multiselect__trigger--placeholder' : ''}`;

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
          <div className="multiselect__dropdown" ref={dropdownRef}>
            {searchable && (
              <input
                type="text"
                className="multiselect__search"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            )}
            {filteredOptions.map(opt => (
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
      {helpText && <span className="help-text">{helpText}</span>}
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}

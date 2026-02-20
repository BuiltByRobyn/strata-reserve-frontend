import { useState, useRef, useEffect } from 'react';
import type { MobileDropdownProps } from '../types/component.types';

export function MobileDropdown({ label, value, options, onChange }: MobileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLabel = options.find(o => o.key === value)?.label || '';

  return (
    <div className="tabs-mobile" ref={ref}>
      <label className="tabs-mobile__label">{label}</label>
      <button
        type="button"
        className={`tabs-mobile__trigger${isOpen ? ' tabs-mobile__trigger--open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {activeLabel}
      </button>
      {isOpen && (
        <ul className="tabs-mobile__options">
          {options.map((opt) => (
            <li key={opt.key}>
              <button
                type="button"
                className={`tabs-mobile__option${opt.key === value ? ' tabs-mobile__option--active' : ''}`}
                onClick={() => {
                  onChange(opt.key);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

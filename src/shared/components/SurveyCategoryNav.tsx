import { useMediaQuery } from '../hooks/useMediaQuery';
import { MobileDropdown } from './MobileDropdown';
import type { SurveyCategoryNavProps } from '../types/component.types';

export function SurveyCategoryNav({
  sections,
  activeSection,
  onSelect,
  completionMap,
}: SurveyCategoryNavProps) {
  const isDesktop = useMediaQuery('(min-width: 750px)');

  if (!isDesktop) {
    return (
      <MobileDropdown
        label="Survey Type"
        value={activeSection}
        options={sections.map(s => ({
          key: s.key,
          label: s.label,
        }))}
        onChange={onSelect}
      />
    );
  }

  return (
    <div className="survey-category-nav">
      {sections.map((section) => {
        const isActive = activeSection === section.key;
        const isComplete = completionMap?.[section.key];
        return (
          <button
            key={section.key}
            className={`category-btn${isActive ? ' category-btn--active' : ''}${isComplete ? ' category-btn--complete' : ''}`}
            onClick={() => onSelect(section.key)}
            type="button"
          >
            {section.label}
          </button>
        );
      })}
    </div>
  );
}

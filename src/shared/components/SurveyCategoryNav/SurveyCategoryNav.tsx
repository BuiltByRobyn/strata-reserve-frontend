import type { SurveyCategoryNavProps } from '../../types/component.types';

export function SurveyCategoryNav({
  sections,
  activeSection,
  onSelect,
  completionMap,
}: SurveyCategoryNavProps) {
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

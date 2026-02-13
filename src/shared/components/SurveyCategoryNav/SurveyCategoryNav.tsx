import type { SurveySection } from '../../types/survey.types';

interface SurveyCategoryNavProps {
  sections: SurveySection[];
  activeSection: string;
  onSelect: (sectionKey: string) => void;
  completionMap?: Record<string, boolean>;
}

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

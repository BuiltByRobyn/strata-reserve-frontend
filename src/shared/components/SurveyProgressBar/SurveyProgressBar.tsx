interface SurveyProgressBarProps {
  answered: number;
  total: number;
}

export function SurveyProgressBar({ answered, total }: SurveyProgressBarProps) {
  const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div className="survey-progress-bar">
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

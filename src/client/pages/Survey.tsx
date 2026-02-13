import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSurvey } from '../../shared/hooks/useSurvey';
import { useClientServiceRequest } from '../../shared/hooks/useClientServiceRequest';
import { SurveyProgressBar } from '../../shared/components/SurveyProgressBar/SurveyProgressBar';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner/LoadingSpinner';
import {
  SURVEY_SECTIONS,
  SECTION_QUESTION_RANGES,
} from '../../shared/types/survey.types';

export default function SurveyPage() {
  const navigate = useNavigate();
  const { serviceRequestId, loading: srLoading } = useClientServiceRequest();
  const { questions, responses, loading, fetchQuestions, fetchResponses } = useSurvey();

  useEffect(() => {
    if (serviceRequestId) {
      fetchQuestions(serviceRequestId);
      fetchResponses(serviceRequestId);
    }
  }, [serviceRequestId, fetchQuestions, fetchResponses]);

  const getSectionQuestionCount = (sectionKey: string) => {
    const range = SECTION_QUESTION_RANGES[sectionKey];
    if (!range) return { total: 0, answered: 0 };

    const sectionQuestions = questions.filter(
      q => q.sortOrder >= range.start && q.sortOrder <= range.end
    );
    const answeredIds = new Set(responses.map(r => r.questionId));
    const answered = sectionQuestions.filter(q => answeredIds.has(q.questionId)).length;

    return { total: sectionQuestions.length, answered };
  };

  const totalQuestions = questions.length;
  const totalAnswered = responses.length;

  const isSectionComplete = (sectionKey: string) => {
    const { total, answered } = getSectionQuestionCount(sectionKey);
    return total > 0 && answered >= total;
  };

  if (srLoading || loading) return <LoadingSpinner />;

  if (!serviceRequestId) {
    return (
      <div className="survey-page">
        <h1>Surveys</h1>
        <p>No active service request found. Please contact your administrator.</p>
      </div>
    );
  }

  return (
    <div className="survey-page">
      <h1>Surveys</h1>
      <p className="survey-subtitle">
        Based on your input information, you will need to complete the following survey sections
      </p>

      <SurveyProgressBar answered={totalAnswered} total={totalQuestions} />

      <div className="survey-section-list">
        {SURVEY_SECTIONS.map((section) => {
          const hasQuestions = !!SECTION_QUESTION_RANGES[section.key];
          const complete = isSectionComplete(section.key);

          return (
            <div
              key={section.key}
              className="survey-section-item"
              onClick={() => navigate(`/client/survey/${section.key}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/client/survey/${section.key}`)}
            >
              <div className="section-info">
                <span className="section-label">{section.label}</span>
                <span className="section-description">{section.description}</span>
              </div>
              <span className={`section-status ${complete ? 'complete' : 'incomplete'}`}>
                {!hasQuestions ? 'Coming Soon' : complete ? 'Complete' : 'Incomplete'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

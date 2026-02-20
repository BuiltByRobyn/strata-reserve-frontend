import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSurvey } from '../../shared/hooks/useSurvey';
import { useClientServiceRequest } from '../../shared/hooks/useClientServiceRequest';
import { SurveyProgressBar } from '../../shared/components/SurveyProgressBar';
import { SurveyCategoryNav } from '../../shared/components/SurveyCategoryNav';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import {
  SURVEY_SECTIONS,
  SECTION_QUESTION_RANGES,
} from '../../shared/types/survey.types';
import type { SurveyQuestion, SaveResponsePayload } from '../../shared/types/survey.types';

const QUESTIONS_PER_PAGE = 5;

export default function SurveySectionPage() {
  const { section } = useParams<{ section: string }>();
  const navigate = useNavigate();
  const { activeRequest, serviceRequestId, loading: srLoading, submitForReview } = useClientServiceRequest();
  const {
    questions: allQuestions,
    responses,
    loading,
    saving,
    fetchQuestions,
    fetchResponses,
    saveResponses,
    getResponseForQuestion,
  } = useSurvey();

  const [page, setPage] = useState(0);
  const [localAnswers, setLocalAnswers] = useState<Record<number, SaveResponsePayload>>({});
  const [submitting, setSubmitting] = useState(false);
  const prevPageRef = useRef(page);
  const prevSectionRef = useRef(section);

  useEffect(() => {
    if (serviceRequestId) {
      fetchQuestions(serviceRequestId);
      fetchResponses(serviceRequestId);
    }
  }, [serviceRequestId, fetchQuestions, fetchResponses]);

  const sectionConfig = SURVEY_SECTIONS.find(s => s.key === section);
  const range = section ? SECTION_QUESTION_RANGES[section] : null;

  const sectionQuestions = range
    ? allQuestions.filter(q => q.sortOrder >= range.start && q.sortOrder <= range.end)
    : [];

  const totalPages = Math.ceil(sectionQuestions.length / QUESTIONS_PER_PAGE);
  const pageQuestions = sectionQuestions.slice(
    page * QUESTIONS_PER_PAGE,
    (page + 1) * QUESTIONS_PER_PAGE
  );

  const isLastPage = page >= totalPages - 1;
  const currentSectionIdx = SURVEY_SECTIONS.findIndex(s => s.key === section);
  const isLastSection = currentSectionIdx >= SURVEY_SECTIONS.length - 1;

  const totalAnswered = responses.length;
  const totalQuestions = allQuestions.length;

  const buildPendingPayloads = useCallback(() => {
    return Object.values(localAnswers).filter(a => {
      return a.responseText || a.responseNumber !== null || a.responseBoolean !== null || a.responseDate || a.multipleChoiceOptionId;
    });
  }, [localAnswers]);

  const saveCurrent = useCallback(async () => {
    if (!serviceRequestId) return;
    const payloads = buildPendingPayloads();
    if (payloads.length > 0) {
      await saveResponses(serviceRequestId, payloads);
      setLocalAnswers({});
    }
  }, [serviceRequestId, buildPendingPayloads, saveResponses]);

  useEffect(() => {
    if (prevPageRef.current !== page || prevSectionRef.current !== section) {
      prevPageRef.current = page;
      prevSectionRef.current = section;
    }
  }, [page, section]);

  const handlePageChange = async (newPage: number) => {
    await saveCurrent();
    setPage(newPage);
    window.scrollTo(0, 0);
  };

  const handleSectionChange = async (sectionKey: string) => {
    await saveCurrent();
    setPage(0);
    navigate(`/client/survey/${sectionKey}`);
  };

  const handleSave = async () => {
    await saveCurrent();
    navigate('/client/dashboard');
  };

  const handleSaveAndSubmit = async () => {
    await saveCurrent();
    setSubmitting(true);
    const success = await submitForReview();
    setSubmitting(false);
    if (success) {
      navigate('/client/survey');
    }
  };

  const updateAnswer = (questionId: number, field: keyof SaveResponsePayload, value: unknown) => {
    setLocalAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        questionId,
        [field]: value,
      },
    }));
  };

  const getAnswer = (questionId: number): SaveResponsePayload => {
    if (localAnswers[questionId]) return localAnswers[questionId];

    const existing = getResponseForQuestion(questionId);
    if (existing) {
      return {
        questionId,
        responseText: existing.responseText,
        responseDate: existing.responseDate,
        responseNumber: existing.responseNumber,
        responseBoolean: existing.responseBoolean,
        multipleChoiceOptionId: existing.multipleChoiceOptionId,
      };
    }
    return { questionId };
  };

  const completionMap: Record<string, boolean> = {};
  for (const s of SURVEY_SECTIONS) {
    const r = SECTION_QUESTION_RANGES[s.key];
    if (!r) continue;
    const sq = allQuestions.filter(q => q.sortOrder >= r.start && q.sortOrder <= r.end);
    const answeredIds = new Set(responses.map(resp => resp.questionId));
    completionMap[s.key] = sq.length > 0 && sq.every(q => answeredIds.has(q.questionId));
  }

  const renderQuestion = (q: SurveyQuestion, index: number) => {
    const answer = getAnswer(q.questionId);
    const questionNumber = page * QUESTIONS_PER_PAGE + index + 1;

    return (
      <div key={q.questionId} className="survey-question">
        <label className="question-label">
          {questionNumber}. {q.questionText}
          {q.isRequired && !range && <span className="required-mark">*</span>}
        </label>

        {q.informationText && (
          <p className="question-info">{q.informationText}</p>
        )}

        {q.questionType === 'textarea' && (
          <textarea
            className="question-input question-textarea"
            value={answer.responseText || ''}
            onChange={(e) => updateAnswer(q.questionId, 'responseText', e.target.value)}
            placeholder={q.informationText || 'Enter your answer...'}
            rows={3}
          />
        )}

        {q.questionType === 'text' && (
          <input
            type="text"
            className="question-input"
            value={answer.responseText || ''}
            onChange={(e) => updateAnswer(q.questionId, 'responseText', e.target.value)}
            placeholder="Enter your answer..."
          />
        )}

        {q.questionType === 'number' && (
          <input
            type="number"
            className="question-input"
            value={answer.responseNumber ?? ''}
            onChange={(e) => updateAnswer(q.questionId, 'responseNumber', e.target.value ? parseInt(e.target.value) : null)}
            placeholder="Enter number..."
          />
        )}

        {q.questionType === 'boolean' && (
          <div className="question-boolean">
            <label>
              <input
                type="radio"
                name={`q-${q.questionId}`}
                checked={answer.responseBoolean === true}
                onChange={() => updateAnswer(q.questionId, 'responseBoolean', true)}
              />
              Yes
            </label>
            <label>
              <input
                type="radio"
                name={`q-${q.questionId}`}
                checked={answer.responseBoolean === false}
                onChange={() => updateAnswer(q.questionId, 'responseBoolean', false)}
              />
              No
            </label>
          </div>
        )}

        {q.questionType === 'date' && (
          <input
            type="date"
            className="question-input"
            value={answer.responseDate || ''}
            onChange={(e) => updateAnswer(q.questionId, 'responseDate', e.target.value)}
          />
        )}

        {q.questionType === 'multiple_choice' && (
          <div className="question-choices">
            {q.multipleChoiceOptions.map((opt) => (
              <label key={opt.optionId} className="choice-option">
                <input
                  type="radio"
                  name={`q-${q.questionId}`}
                  checked={answer.multipleChoiceOptionId === opt.optionId}
                  onChange={() => updateAnswer(q.questionId, 'multipleChoiceOptionId', opt.optionId)}
                />
                {opt.optionText}
              </label>
            ))}
          </div>
        )}

        {q.questionType === 'checkbox' && (
          <div className="question-choices question-checkboxes">
            {q.multipleChoiceOptions.map((opt) => (
              <label key={opt.optionId} className="choice-option">
                <input
                  type="checkbox"
                  checked={answer.responseText?.split(',').includes(String(opt.optionId)) || false}
                  onChange={(e) => {
                    const current = answer.responseText?.split(',').filter(Boolean) || [];
                    const id = String(opt.optionId);
                    const updated = e.target.checked
                      ? [...current, id]
                      : current.filter(v => v !== id);
                    updateAnswer(q.questionId, 'responseText', updated.join(','));
                  }}
                />
                {opt.optionText}
              </label>
            ))}
          </div>
        )}

        {q.questionType === 'none_or_explain' && (
          <div className="question-none-or-explain">
            <label className="choice-option">
              <input
                type="checkbox"
                checked={answer.responseText === 'NONE'}
                onChange={(e) => {
                  updateAnswer(q.questionId, 'responseText', e.target.checked ? 'NONE' : '');
                }}
              />
              None
            </label>
            {answer.responseText !== 'NONE' && (
              <textarea
                className="question-input question-textarea"
                value={answer.responseText === 'NONE' ? '' : (answer.responseText || '')}
                onChange={(e) => updateAnswer(q.questionId, 'responseText', e.target.value)}
                placeholder="Please explain..."
                rows={3}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  if (srLoading || loading) return <LoadingSpinner />;

  if (!serviceRequestId) {
    return (
      <div className="survey-section-page">
        <p>No active service request found. Please contact your administrator.</p>
      </div>
    );
  }

  const hasQuestions = sectionQuestions.length > 0;

  return (
    <div className="survey-section-page">
      <SurveyCategoryNav
        sections={SURVEY_SECTIONS}
        activeSection={section || ''}
        onSelect={handleSectionChange}
        completionMap={completionMap}
      />

      <h1>{sectionConfig?.label || 'Survey'} Survey</h1>

      <SurveyProgressBar answered={totalAnswered} total={totalQuestions} />

      <div className="survey-questions-container">
        {!hasQuestions ? (
          <div className="survey-coming-soon">
            <p>{sectionConfig?.label} survey coming soon.</p>
          </div>
        ) : (
          <>
            {pageQuestions.map((q, i) => renderQuestion(q, i))}
          </>
        )}
      </div>

      <div className="survey-pagination">
        {(page > 0 || currentSectionIdx > 0) && (
          <button
            className="btn-secondary btn-nav"
            onClick={async () => {
              if (page > 0) {
                await handlePageChange(page - 1);
              } else if (currentSectionIdx > 0) {
                await saveCurrent();
                navigate(`/client/survey/${SURVEY_SECTIONS[currentSectionIdx - 1].key}`);
              }
            }}
            disabled={saving}
          >
            Previous Step
          </button>
        )}

        {isLastPage && isLastSection ? (
          <>
            <button
              className="btn-secondary btn-nav"
              onClick={handleSave}
              disabled={saving || submitting}
            >
              Save
            </button>
            <button
              className="btn-primary btn-nav"
              onClick={handleSaveAndSubmit}
              disabled={saving || submitting}
            >
              {submitting ? 'Submitting...' : activeRequest?.submittedForReviewDate ? 'Resubmit' : 'Save and Submit'}
            </button>
          </>
        ) : (
          <button
            className="btn-primary btn-nav"
            onClick={async () => {
              if (page < totalPages - 1) {
                await handlePageChange(page + 1);
              } else {
                await saveCurrent();
                const currentIdx = SURVEY_SECTIONS.findIndex(s => s.key === section);
                if (currentIdx < SURVEY_SECTIONS.length - 1) {
                  navigate(`/client/survey/${SURVEY_SECTIONS[currentIdx + 1].key}`);
                }
              }
            }}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Next Step'}
          </button>
        )}
      </div>
    </div>
  );
}

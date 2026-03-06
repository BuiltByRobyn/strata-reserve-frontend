import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useSurvey } from '../../shared/hooks/useSurvey';
import { useClientFileNumber } from '../../shared/hooks/useClientFileNumber';
import { useApiClient } from '../../shared/hooks/useApiClient';
import { SurveyProgressBar } from '../../shared/components/SurveyProgressBar';
import { SurveyCategoryNav } from '../../shared/components/SurveyCategoryNav';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { getFilenameFromDisposition, triggerBlobDownload } from '../../shared/utils/fileUtils';
import {
  SURVEY_SECTIONS,
} from '../../shared/types/survey.types';
import type { SurveyQuestion, SaveResponsePayload } from '../../shared/types/survey.types';

const QUESTIONS_PER_PAGE = 5;

export default function SurveySectionPage() {
  const { section } = useParams<{ section: string }>();
  const navigate = useNavigate();
  const { activeRequest, fileNumberId, loading: srLoading, submitForReview } = useClientFileNumber();
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
  const api = useApiClient();

  const [page, setPage] = useState(0);
  const [localAnswers, setLocalAnswers] = useState<Record<string, SaveResponsePayload>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const prevPageRef = useRef(page);
  const prevSectionRef = useRef(section);

  useEffect(() => {
    if (fileNumberId) {
      fetchQuestions(fileNumberId);
      fetchResponses(fileNumberId);
    }
  }, [fileNumberId, fetchQuestions, fetchResponses]);

  const sectionConfig = SURVEY_SECTIONS.find(s => s.key === section);

  // Separate parent questions from sub-questions
  const allSectionQuestions = sectionConfig
    ? allQuestions.filter(q => q.questionCategory === sectionConfig.label)
    : [];

  const sectionQuestions = allSectionQuestions.filter(q => q.parentQuestionId == null);

  // Map: parentQuestionId -> sub-questions (in order)
  const subQuestionsMap = new Map<string, SurveyQuestion[]>();
  for (const q of allSectionQuestions) {
    if (q.parentQuestionId != null) {
      const key = `${q.parentQuestionId}-${q.propertyTypeId}`;
      const list = subQuestionsMap.get(key) ?? [];
      list.push(q);
      subQuestionsMap.set(key, list);
    }
  }

  const requiredSections = SURVEY_SECTIONS.filter(s =>
    allQuestions.some(q => q.questionCategory === s.label)
  );

  const totalPages = Math.ceil(sectionQuestions.length / QUESTIONS_PER_PAGE);
  const pageQuestions = sectionQuestions.slice(
    page * QUESTIONS_PER_PAGE,
    (page + 1) * QUESTIONS_PER_PAGE
  );

  const isLastPage = page >= totalPages - 1;
  const currentSectionIdx = requiredSections.findIndex(s => s.key === section);
  const isLastSection = currentSectionIdx >= requiredSections.length - 1;

  const totalAnswered = responses.length;
  const totalQuestions = allQuestions.length;

  const buildPendingPayloads = useCallback(() => {
    return Object.values(localAnswers).filter(a => {
      return (
        (a.responseText != null && a.responseText.trim() !== '') ||
        (a.responseNumber !== undefined && a.responseNumber !== null) ||
        (a.responseBoolean !== undefined && a.responseBoolean !== null) ||
        (a.responseDate != null && a.responseDate.trim() !== '') ||
        (a.multipleChoiceOptionId !== undefined && a.multipleChoiceOptionId !== null)
      );
    });
  }, [localAnswers]);

  const saveCurrent = useCallback(async () => {
    if (!fileNumberId) return;
    const payloads = buildPendingPayloads();
    if (payloads.length > 0) {
      await saveResponses(fileNumberId, payloads);
      setLocalAnswers({});
    }
  }, [fileNumberId, buildPendingPayloads, saveResponses]);

  useEffect(() => {
    if (prevPageRef.current !== page || prevSectionRef.current !== section) {
      prevPageRef.current = page;
      prevSectionRef.current = section;
    }
  }, [page, section]);

  // Reset to first page when navigating to a new section
  useEffect(() => {
    setPage(0);
  }, [section]);

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
    setSubmitError(null);
    const result = await submitForReview();
    setSubmitting(false);
    if (result.success) {
      toast.success('Survey submitted successfully!');
      navigate('/client/survey');
    } else {
      toast.error('Please complete all required questions before submitting.');
      setSubmitError(result.error || 'Failed to submit');
    }
  };

  const handleDownloadPdf = async () => {
    if (!fileNumberId) return;
    setDownloadingPdf(true);
    try {
      const res = await api.rawFetch('/client/file-numbers/active/survey/pdf');
      if (!res.ok) {
        let message = `Download failed (${res.status})`;
        try {
          const data = await res.json();
          if (data?.error) message = data.error;
        } catch { /* ignore */ }
        throw new Error(message);
      }
      const blob = await res.blob();
      const filename =
        getFilenameFromDisposition(res.headers.get('Content-Disposition')) ||
        `Survey-Answers-${activeRequest?.strata?.strataPlan || 'Survey'}.pdf`;
      triggerBlobDownload(blob, filename);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const updateAnswer = (questionId: number, propertyTypeId: number, field: keyof SaveResponsePayload, value: unknown) => {
    const key = `${questionId}-${propertyTypeId}`;
    setLocalAnswers(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        questionId,
        propertyTypeId,
        [field]: value,
      },
    }));
  };

  const getAnswer = (questionId: number, propertyTypeId: number): SaveResponsePayload => {
    const key = `${questionId}-${propertyTypeId}`;
    if (localAnswers[key]) return localAnswers[key];

    const existing = getResponseForQuestion(questionId, propertyTypeId);
    if (existing) {
      return {
        questionId,
        propertyTypeId,
        responseText: existing.responseText,
        responseDate: existing.responseDate,
        responseNumber: existing.responseNumber,
        responseBoolean: existing.responseBoolean,
        multipleChoiceOptionId: existing.multipleChoiceOptionId,
      };
    }
    return { questionId, propertyTypeId };
  };

  const completionMap: Record<string, boolean> = {};
  for (const s of SURVEY_SECTIONS) {
    const sq = allQuestions.filter(q => q.questionCategory === s.label);
    const answeredIds = new Set(responses.map(resp => resp.questionId));
    completionMap[s.key] = sq.length > 0 && sq.every(q => answeredIds.has(q.questionId));
  }

  const renderSubQuestion = (q: SurveyQuestion, index: number) => {
    const answer = getAnswer(q.questionId, q.propertyTypeId);
    return (
      <div key={q.fnSurveyQuestionId} className="survey-sub-question">
        <label className="question-label">
          <span className="sub-label-badge">{String.fromCharCode(97 + index)}.</span> {q.questionText}
          {q.isRequired && <span className="required-mark">*</span>}
        </label>
        {q.questionType === 'textarea' && (
          <textarea
            className="question-input question-textarea"
            value={answer.responseText || ''}
            onChange={(e) => updateAnswer(q.questionId, q.propertyTypeId, 'responseText', e.target.value)}
            placeholder="Enter your answer..."
            rows={2}
          />
        )}
        {q.questionType === 'text' && (
          <input
            type="text"
            className="question-input"
            value={answer.responseText || ''}
            onChange={(e) => updateAnswer(q.questionId, q.propertyTypeId, 'responseText', e.target.value)}
            placeholder="Enter your answer..."
          />
        )}
        {q.questionType === 'number' && (
          <input
            type="number"
            className="question-input"
            value={answer.responseNumber ?? ''}
            onChange={(e) => updateAnswer(q.questionId, q.propertyTypeId, 'responseNumber', e.target.value ? parseInt(e.target.value) : null)}
            placeholder="Enter number..."
          />
        )}
      </div>
    );
  };

  const renderQuestion = (q: SurveyQuestion, index: number) => {
    const answer = getAnswer(q.questionId, q.propertyTypeId);
    const questionNumber = page * QUESTIONS_PER_PAGE + index + 1;
    const subQuestions = subQuestionsMap.get(`${q.questionId}-${q.propertyTypeId}`) ?? [];

    const hasAnswer = (
      (answer.responseText != null && answer.responseText.trim() !== '') ||
      answer.responseNumber != null ||
      answer.responseBoolean != null ||
      (answer.responseDate != null && answer.responseDate.trim() !== '') ||
      answer.multipleChoiceOptionId != null
    );

    return (
      <div key={q.fnSurveyQuestionId} className="survey-question">
        <label className="question-label">
          {questionNumber}. {q.questionText}
          {q.isRequired && <span className="required-mark">*</span>}
        </label>

        {q.informationText && (
          <p className="question-info">{q.informationText}</p>
        )}

        {q.questionType === 'textarea' && (
          <textarea
            className="question-input question-textarea"
            value={answer.responseText || ''}
            onChange={(e) => updateAnswer(q.questionId, q.propertyTypeId, 'responseText', e.target.value)}
            placeholder="Enter your answer..."
            rows={3}
          />
        )}

        {q.questionType === 'text' && (
          <input
            type="text"
            className="question-input"
            value={answer.responseText || ''}
            onChange={(e) => updateAnswer(q.questionId, q.propertyTypeId, 'responseText', e.target.value)}
            placeholder="Enter your answer..."
          />
        )}

        {q.questionType === 'number' && (
          <input
            type="number"
            className="question-input"
            value={answer.responseNumber ?? ''}
            onChange={(e) => updateAnswer(q.questionId, q.propertyTypeId, 'responseNumber', e.target.value ? parseInt(e.target.value) : null)}
            placeholder="Enter number..."
          />
        )}

        {q.questionType === 'boolean' && (
          <div className="question-boolean">
            <label>
              <input
                type="radio"
                name={`q-${q.fnSurveyQuestionId}`}
                checked={answer.responseBoolean === true}
                onChange={() => updateAnswer(q.questionId, q.propertyTypeId, 'responseBoolean', true)}
              />
              Yes
            </label>
            <label>
              <input
                type="radio"
                name={`q-${q.fnSurveyQuestionId}`}
                checked={answer.responseBoolean === false}
                onChange={() => updateAnswer(q.questionId, q.propertyTypeId, 'responseBoolean', false)}
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
            onChange={(e) => updateAnswer(q.questionId, q.propertyTypeId, 'responseDate', e.target.value)}
          />
        )}

        {q.questionType === 'multiple_choice' && (
          <div className="question-choices">
            {q.multipleChoiceOptions.map((opt) => (
              <label key={opt.optionId} className="choice-option">
                <input
                  type="radio"
                  name={`q-${q.fnSurveyQuestionId}`}
                  checked={answer.multipleChoiceOptionId === opt.optionId}
                  onChange={() => updateAnswer(q.questionId, q.propertyTypeId, 'multipleChoiceOptionId', opt.optionId)}
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
                    updateAnswer(q.questionId, q.propertyTypeId, 'responseText', updated.join(','));
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
                  updateAnswer(q.questionId, q.propertyTypeId, 'responseText', e.target.checked ? 'NONE' : '');
                }}
              />
              None
            </label>
            {answer.responseText !== 'NONE' && (
              <textarea
                className="question-input question-textarea"
                value={answer.responseText === 'NONE' ? '' : (answer.responseText || '')}
                onChange={(e) => updateAnswer(q.questionId, q.propertyTypeId, 'responseText', e.target.value)}
                placeholder="Please explain..."
                rows={3}
              />
            )}
          </div>
        )}

        {subQuestions.length > 0 && hasAnswer && (
          <div className="survey-sub-questions">
            {subQuestions.map((sq, i) => renderSubQuestion(sq, i))}
          </div>
        )}
      </div>
    );
  };

  if (srLoading || loading) return <LoadingSpinner />;

  if (!fileNumberId) {
    return (
      <div className="survey-section-page">
        <p>No active file number found. Please contact your administrator.</p>
      </div>
    );
  }

  const hasQuestions = sectionQuestions.length > 0;

  return (
    <div className="survey-section-page">
      <SurveyCategoryNav
        sections={requiredSections}
        activeSection={section || ''}
        onSelect={handleSectionChange}
        completionMap={completionMap}
      />

      <h1>{sectionConfig?.label || 'Survey'} Survey</h1>

      <SurveyProgressBar answered={totalAnswered} total={totalQuestions} />

      <div className="survey-questions-container">
        {!hasQuestions ? (
          <div className="survey-coming-soon">
            <p>You are not required to complete this section at this time.</p>
          </div>
        ) : (
          <>
            {pageQuestions.map((q, i) => renderQuestion(q, i))}
          </>
        )}
      </div>

      {submitError && (
        <div className="submit-error">{submitError}</div>
      )}

      <div className="survey-pagination">
        {(page > 0 || currentSectionIdx > 0) && (
          <button
            className="btn-secondary btn-nav"
            onClick={async () => {
              if (page > 0) {
                await handlePageChange(page - 1);
              } else if (currentSectionIdx > 0) {
                await saveCurrent();
                navigate(`/client/survey/${requiredSections[currentSectionIdx - 1].key}`);
              }
            }}
            disabled={saving}
          >
            Previous Step
          </button>
        )}

        {!(isLastPage && isLastSection) && (
          <button
            type="button"
            className="btn-primary btn-nav"
            onClick={handleDownloadPdf}
            disabled={!fileNumberId || downloadingPdf}
          >
            {downloadingPdf ? 'Downloading...' : 'Download Survey'}
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
            className="btn-secondary btn-nav"
            onClick={async () => {
              if (page < totalPages - 1) {
                await handlePageChange(page + 1);
              } else {
                await saveCurrent();
                if (currentSectionIdx < requiredSections.length - 1) {
                  navigate(`/client/survey/${requiredSections[currentSectionIdx + 1].key}`);
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

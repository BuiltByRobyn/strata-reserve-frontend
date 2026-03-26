import { useState, useEffect, useCallback } from 'react';
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
  const { activeRequest, fileId, loading: srLoading, submitForReview } = useClientFileNumber();
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

  const isReadOnly = !!activeRequest?.submittedForReviewDate;

  const [page, setPage] = useState(0);
  const [localAnswers, setLocalAnswers] = useState<Record<string, SaveResponsePayload>>({});
  const [numberErrors, setNumberErrors] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (fileId) {
      fetchQuestions(fileId);
      fetchResponses(fileId);
    }
  }, [fileId, fetchQuestions, fetchResponses]);

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
    allQuestions.some(q => q.questionCategory === s.label && q.parentQuestionId == null)
  );

  const totalPages = Math.ceil(sectionQuestions.length / QUESTIONS_PER_PAGE);
  const pageQuestions = sectionQuestions.slice(
    page * QUESTIONS_PER_PAGE,
    (page + 1) * QUESTIONS_PER_PAGE
  );

  const isLastPage = page >= totalPages - 1;
  const currentSectionIdx = requiredSections.findIndex(s => s.key === section);
  const isLastSection = currentSectionIdx >= requiredSections.length - 1;

  const parentQuestionKeys = new Set(
    allQuestions.filter(q => q.parentQuestionId == null).map(q => `${q.questionId}-${q.propertyTypeId}`)
  );
  const totalQuestions = parentQuestionKeys.size;
  const isResponseAnswered = (r: { responseText?: string | null; responseNumber?: number | null; responseBoolean?: boolean | null; responseDate?: string | null; multipleChoiceOptionId?: number | null }) =>
    (r.responseText != null && r.responseText.trim() !== '') ||
    r.responseNumber != null ||
    r.responseBoolean != null ||
    (r.responseDate != null && r.responseDate.trim() !== '') ||
    r.multipleChoiceOptionId != null;

  const totalAnswered = responses.filter(r => isResponseAnswered(r) && parentQuestionKeys.has(`${r.questionId}-${r.propertyTypeId}`)).length;

  const buildPendingPayloads = useCallback(() => {
    const valid: SaveResponsePayload[] = [];
    const clearances: SaveResponsePayload[] = [];
    for (const a of Object.values(localAnswers)) {
      if (isResponseAnswered(a)) {
        valid.push(a);
      } else {
        const saved = getResponseForQuestion(a.questionId, a.propertyTypeId, a.parentQuestionId);
        if (saved) {
          clearances.push({
            questionId: a.questionId,
            propertyTypeId: a.propertyTypeId,
            parentQuestionId: a.parentQuestionId,
            responseText: null,
            responseNumber: null,
            responseBoolean: null,
            responseDate: null,
            multipleChoiceOptionId: null,
          });
        }
      }
    }
    return [...valid, ...clearances];
  }, [localAnswers, getResponseForQuestion]);

  const saveCurrent = useCallback(async () => {
    if (!fileId) return;
    const payloads = buildPendingPayloads();
    if (payloads.length > 0) {
      await saveResponses(fileId, payloads);
      setLocalAnswers({});
    }
  }, [fileId, buildPendingPayloads, saveResponses]);

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
    toast('Your answers have been saved but not yet finalized, and can still be edited.', { icon: 'ℹ️' });
    navigate('/client/survey');
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

  const handleToggleFlag = useCallback((questionId: number, propertyTypeId: number, flag: 'NOT_APPLICABLE' | 'UNKNOWN') => {
    const key = `${questionId}-${propertyTypeId}`;
    setLocalAnswers(prev => {
      const current = prev[key]?.responseText;
      return {
        ...prev,
        [key]: {
          questionId,
          propertyTypeId,
          responseText: current === flag ? null : flag,
          responseNumber: null,
          responseBoolean: null,
          responseDate: null,
          multipleChoiceOptionId: null,
        },
      };
    });
  }, []);

  const handleSaveAndDownload = async () => {
    if (!fileId) return;
    await saveCurrent();
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


  const answerKey = (questionId: number, propertyTypeId: number, parentQuestionId?: number | null) =>
    parentQuestionId != null ? `${parentQuestionId}-${questionId}-${propertyTypeId}` : `${questionId}-${propertyTypeId}`;

  const updateAnswer = (questionId: number, propertyTypeId: number, field: keyof SaveResponsePayload, value: unknown, parentQuestionId?: number | null) => {
    const key = answerKey(questionId, propertyTypeId, parentQuestionId);
    setLocalAnswers(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        questionId,
        propertyTypeId,
        parentQuestionId: parentQuestionId ?? null,
        [field]: value,
      },
    }));
  };

  const getAnswer = (questionId: number, propertyTypeId: number, parentQuestionId?: number | null): SaveResponsePayload => {
    const key = answerKey(questionId, propertyTypeId, parentQuestionId);
    if (localAnswers[key]) return localAnswers[key];

    const existing = getResponseForQuestion(questionId, propertyTypeId, parentQuestionId);
    if (existing) {
      return {
        questionId,
        propertyTypeId,
        parentQuestionId: existing.parentQuestionId,
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
    const answeredIds = new Set(responses.filter(isResponseAnswered).map(resp => resp.questionId));
    completionMap[s.key] = sq.length > 0 && sq.every(q => answeredIds.has(q.questionId));
  }

  const handleNumberKeyDown = (errorKey: string) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '.', '-'].includes(e.key)) {
      e.preventDefault();
      setNumberErrors(prev => new Set([...prev, errorKey]));
    }
  };

  const handleNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    questionId: number,
    propertyTypeId: number,
    parentQuestionId?: number | null
  ) => {
    const raw = e.target.value;
    const key = answerKey(questionId, propertyTypeId, parentQuestionId);
    if (raw === '' || /^\d+$/.test(raw)) {
      setNumberErrors(prev => { const s = new Set(prev); s.delete(key); return s; });
      updateAnswer(questionId, propertyTypeId, 'responseNumber', raw ? parseInt(raw, 10) : null, parentQuestionId);
    } else {
      setNumberErrors(prev => new Set([...prev, key]));
    }
  };

  const renderSubQuestion = (q: SurveyQuestion, index: number) => {
    const answer = getAnswer(q.questionId, q.propertyTypeId, q.parentQuestionId);
    return (
      <div key={q.fnSurveyQuestionId} className="survey-sub-question">
        <label className="question-label">
          <span className="sub-label-badge">{String.fromCharCode(97 + index)}.</span> {q.questionText}
        </label>
        {q.questionType === 'textarea' && (
          <textarea
            className="question-input question-textarea"
            value={answer.responseText || ''}
            onChange={(e) => updateAnswer(q.questionId, q.propertyTypeId, 'responseText', e.target.value, q.parentQuestionId)}
            placeholder="Enter your answer..."
            rows={2}
            readOnly={isReadOnly}
          />
        )}
        {q.questionType === 'text' && (
          <input
            type="text"
            className="question-input"
            value={answer.responseText || ''}
            onChange={(e) => updateAnswer(q.questionId, q.propertyTypeId, 'responseText', e.target.value, q.parentQuestionId)}
            placeholder="Enter your answer..."
            readOnly={isReadOnly}
          />
        )}
        {q.questionType === 'number' && (
          <>
            <input
              type="number"
              className={`question-input${numberErrors.has(answerKey(q.questionId, q.propertyTypeId, q.parentQuestionId)) ? ' question-input--error' : ''}`}
              value={answer.responseNumber ?? ''}
              onChange={(e) => handleNumberChange(e, q.questionId, q.propertyTypeId, q.parentQuestionId)}
              onKeyDown={handleNumberKeyDown(answerKey(q.questionId, q.propertyTypeId, q.parentQuestionId))}
              placeholder="Enter number..."
              readOnly={isReadOnly}
            />
            {numberErrors.has(answerKey(q.questionId, q.propertyTypeId, q.parentQuestionId)) && (
              <span className="error-text">Please enter a whole number</span>
            )}
          </>
        )}
        {q.questionType === 'boolean' && (
          <div className="question-boolean">
            <label>
              <input
                type="radio"
                name={`sq-${q.fnSurveyQuestionId}`}
                checked={answer.responseBoolean === true}
                onChange={() => updateAnswer(q.questionId, q.propertyTypeId, 'responseBoolean', true, q.parentQuestionId)}
                disabled={isReadOnly}
              />
              Yes
            </label>
            <label>
              <input
                type="radio"
                name={`sq-${q.fnSurveyQuestionId}`}
                checked={answer.responseBoolean === false}
                onChange={() => updateAnswer(q.questionId, q.propertyTypeId, 'responseBoolean', false, q.parentQuestionId)}
                disabled={isReadOnly}
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
            onChange={(e) => updateAnswer(q.questionId, q.propertyTypeId, 'responseDate', e.target.value, q.parentQuestionId)}
            readOnly={isReadOnly}
          />
        )}
        {q.questionType === 'multiple_choice' && (
          <div className="question-choices">
            {q.multipleChoiceOptions.map((opt) => (
              <label key={opt.optionId} className="choice-option">
                <input
                  type="radio"
                  name={`sq-${q.fnSurveyQuestionId}`}
                  checked={answer.multipleChoiceOptionId === opt.optionId}
                  onChange={() => updateAnswer(q.questionId, q.propertyTypeId, 'multipleChoiceOptionId', opt.optionId, q.parentQuestionId)}
                  disabled={isReadOnly}
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
                    updateAnswer(q.questionId, q.propertyTypeId, 'responseText', updated.join(','), q.parentQuestionId);
                  }}
                  disabled={isReadOnly}
                />
                {opt.optionText}
              </label>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderQuestion = (q: SurveyQuestion, index: number) => {
    const answer = getAnswer(q.questionId, q.propertyTypeId);
    const questionNumber = page * QUESTIONS_PER_PAGE + index + 1;
    const subQuestions = subQuestionsMap.get(`${q.questionId}-${q.propertyTypeId}`) ?? [];

    const isFlagged = answer.responseText === 'NOT_APPLICABLE' || answer.responseText === 'UNKNOWN';
    const hasAnswer = !isFlagged && (
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
          <span className="required-mark">*</span>
        </label>

        {q.informationText && (
          <p className="question-info">{q.informationText}</p>
        )}

        {!isReadOnly && (q.allowUnavailable || q.allowNa) && (
          <div className="question-flag-buttons">
            {q.allowUnavailable && (
              <button
                type="button"
                className={`btn-flag${answer.responseText === 'UNKNOWN' ? ' btn-flag--active' : ''}`}
                onClick={() => handleToggleFlag(q.questionId, q.propertyTypeId, 'UNKNOWN')}
              >
                Unknown
              </button>
            )}
            {q.allowNa && (
              <button
                type="button"
                className={`btn-flag${answer.responseText === 'NOT_APPLICABLE' ? ' btn-flag--active' : ''}`}
                onClick={() => handleToggleFlag(q.questionId, q.propertyTypeId, 'NOT_APPLICABLE')}
              >
                Not Applicable
              </button>
            )}
          </div>
        )}

        {isFlagged && (
          <p className="question-flag-label">
            {answer.responseText === 'NOT_APPLICABLE' ? 'Not Applicable' : 'Unknown'}
          </p>
        )}

        {!isFlagged && q.questionType === 'textarea' && (
          <textarea
            className="question-input question-textarea"
            value={answer.responseText || ''}
            onChange={(e) => updateAnswer(q.questionId, q.propertyTypeId, 'responseText', e.target.value)}
            placeholder="Enter your answer..."
            rows={3}
            readOnly={isReadOnly}
          />
        )}

        {!isFlagged && q.questionType === 'text' && (
          <input
            type="text"
            className="question-input"
            value={answer.responseText || ''}
            onChange={(e) => updateAnswer(q.questionId, q.propertyTypeId, 'responseText', e.target.value)}
            placeholder="Enter your answer..."
            readOnly={isReadOnly}
          />
        )}

        {!isFlagged && q.questionType === 'number' && (
          <>
            <input
              type="number"
              className={`question-input${numberErrors.has(answerKey(q.questionId, q.propertyTypeId)) ? ' question-input--error' : ''}`}
              value={answer.responseNumber ?? ''}
              onChange={(e) => handleNumberChange(e, q.questionId, q.propertyTypeId)}
              onKeyDown={handleNumberKeyDown(answerKey(q.questionId, q.propertyTypeId))}
              placeholder="Enter number..."
              readOnly={isReadOnly}
            />
            {numberErrors.has(answerKey(q.questionId, q.propertyTypeId)) && (
              <span className="error-text">Please enter a whole number</span>
            )}
          </>
        )}

        {!isFlagged && q.questionType === 'boolean' && (
          <div className="question-boolean">
            <label>
              <input
                type="radio"
                name={`q-${q.fnSurveyQuestionId}`}
                checked={answer.responseBoolean === true}
                onChange={() => updateAnswer(q.questionId, q.propertyTypeId, 'responseBoolean', true)}
                disabled={isReadOnly}
              />
              Yes
            </label>
            <label>
              <input
                type="radio"
                name={`q-${q.fnSurveyQuestionId}`}
                checked={answer.responseBoolean === false}
                onChange={() => updateAnswer(q.questionId, q.propertyTypeId, 'responseBoolean', false)}
                disabled={isReadOnly}
              />
              No
            </label>
          </div>
        )}

        {!isFlagged && q.questionType === 'date' && (
          <input
            type="date"
            className="question-input"
            value={answer.responseDate || ''}
            onChange={(e) => updateAnswer(q.questionId, q.propertyTypeId, 'responseDate', e.target.value)}
            readOnly={isReadOnly}
          />
        )}

        {!isFlagged && q.questionType === 'multiple_choice' && (
          <div className="question-choices">
            {q.multipleChoiceOptions.map((opt) => (
              <label key={opt.optionId} className="choice-option">
                <input
                  type="radio"
                  name={`q-${q.fnSurveyQuestionId}`}
                  checked={answer.multipleChoiceOptionId === opt.optionId}
                  onChange={() => updateAnswer(q.questionId, q.propertyTypeId, 'multipleChoiceOptionId', opt.optionId)}
                  disabled={isReadOnly}
                />
                {opt.optionText}
              </label>
            ))}
          </div>
        )}

        {!isFlagged && q.questionType === 'checkbox' && (
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
                  disabled={isReadOnly}
                />
                {opt.optionText}
              </label>
            ))}
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

  if (!fileId) {
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

      <p className="section-instruction">Please complete the questions in the boxes if applicable, otherwise please check the not applicable button</p>

      <div className="survey-questions-container">
        {!hasQuestions ? (
          <div className="survey-coming-soon">
            <p>You are not required to complete this section at this time.</p>
          </div>
        ) : (() => {
          const clientTypeIds = activeRequest?.clientPropertyTypes ?? [];
          if (clientTypeIds.length <= 1) {
            return pageQuestions.map((q, i) => renderQuestion(q, i));
          }
          const propertyTypeNameMap = new Map<number, string>();
          for (const spt of activeRequest?.strata?.strataPropertyTypes ?? []) {
            if (spt.propertyType) {
              propertyTypeNameMap.set(spt.propertyType.propertyTypeId, spt.propertyType.propertyTypeName);
            }
          }
          const groups: { propertyTypeId: number; questions: SurveyQuestion[] }[] = [];
          for (const q of pageQuestions) {
            const last = groups[groups.length - 1];
            if (last && last.propertyTypeId === q.propertyTypeId) {
              last.questions.push(q);
            } else {
              groups.push({ propertyTypeId: q.propertyTypeId, questions: [q] });
            }
          }
          let globalIndex = page * QUESTIONS_PER_PAGE;
          return groups.map(group => (
            <div key={group.propertyTypeId} className="survey-property-type-group">
              <h3 className="survey-property-type-heading">
                {propertyTypeNameMap.get(group.propertyTypeId) ?? `Property Type ${group.propertyTypeId}`}
              </h3>
              {group.questions.map((q) => {
                const el = renderQuestion(q, globalIndex - page * QUESTIONS_PER_PAGE);
                globalIndex++;
                return el;
              })}
            </div>
          ));
        })()}
      </div>

      {submitError && (
        <div className="submit-error">{submitError}</div>
      )}

      <div className="survey-pagination">
        {isReadOnly ? (
          <button
            className="btn-primary btn-nav"
            onClick={() => navigate('/client/survey')}
          >
            Back to Survey
          </button>
        ) : (
          <>
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
                Previous Page
              </button>
            )}

            {isLastPage && isLastSection ? (
              <>
                <button
                  className="btn-secondary btn-nav"
                  onClick={handleSave}
                  disabled={saving || submitting}
                >
                  Save Pending Future Changes
                </button>
                <button
                  className="btn-secondary btn-nav"
                  onClick={handleSaveAndDownload}
                  disabled={saving || submitting || downloadingPdf}
                >
                  {downloadingPdf ? 'Downloading...' : 'Save and Download PDF'}
                </button>
                <button
                  className="btn-primary btn-nav"
                  onClick={handleSaveAndSubmit}
                  disabled={saving || submitting}
                >
                  {submitting ? 'Submitting...' : 'Finalize Answers & Submit'}
                </button>
              </>
            ) : (
              <>
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
                {saving ? 'Saving...' : 'Next Page'}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

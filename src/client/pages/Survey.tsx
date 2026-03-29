import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useSurvey } from '../../shared/hooks/useSurvey';
import { useClientFileNumber } from '../../shared/hooks/useClientFileNumber';
import { useLookups } from '../../shared/hooks/useLookups';
import { useApiClient } from '../../shared/hooks/useApiClient';
import { SurveyProgressBar } from '../../shared/components/SurveyProgressBar';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { Modal } from '../../shared/components/Modal';
import { NoFileNumberState } from '../../shared/components/NoFileNumberState';
import { getFilenameFromDisposition, triggerBlobDownload } from '../../shared/utils/fileUtils';
import type { SurveyQuestion, SurveyResponse } from '../../shared/types/survey.types';

export default function SurveyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeRequest, fileId, loading: srLoading } = useClientFileNumber();
  const { questions, responses, loading, fetchQuestions, fetchResponses } = useSurvey();
  const { questionCategories } = useLookups();
  const api = useApiClient();

  const surveySections = useMemo(() =>
    questionCategories.map(qc => ({ key: qc.key, label: qc.label, description: qc.description ?? '' })),
    [questionCategories]
  );

  const [showThankYou, setShowThankYou] = useState(false);
  const [showTimelinesMessage, setShowTimelinesMessage] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const isSubmitted = !!activeRequest?.submittedForReviewDate;

  const handleSectionClick = (sectionKey: string) => {
    if (isSubmitted) {
      setExpandedSections(prev => {
        const next = new Set(prev);
        if (next.has(sectionKey)) next.delete(sectionKey); else next.add(sectionKey);
        return next;
      });
    } else {
      navigate(`/client/survey/${sectionKey}`);
    }
  };

  const formatAnswer = (q: SurveyQuestion, response: SurveyResponse | undefined): string => {
    if (!response) return '—';
    if (response.responseText === 'NOT_APPLICABLE') return 'Not Applicable';
    if (response.responseText === 'UNKNOWN') return 'Unknown';
    if (q.questionType === 'boolean') {
      return response.responseBoolean === true ? 'Yes' : response.responseBoolean === false ? 'No' : '—';
    }
if (q.questionType === 'multiple_choice') {
      const opt = q.multipleChoiceOptions.find(o => o.optionId === response.multipleChoiceOptionId);
      return opt?.optionText || '—';
    }
    if (q.questionType === 'checkbox') {
      const ids = (response.responseText || '').split(',').map(Number).filter(Boolean);
      return ids.map(id => q.multipleChoiceOptions.find(o => o.optionId === id)?.optionText).filter(Boolean).join(', ') || '—';
    }
    if (q.questionType === 'date') return response.responseDate || '—';
    if (q.questionType === 'number') return response.responseNumber != null ? String(response.responseNumber) : '—';
    return response.responseText || '—';
  };

  useEffect(() => {
    if (isSubmitted && fileId) {
      const key = `survey_thanked_${fileId}`;
      if (!localStorage.getItem(key)) {
        setShowThankYou(true);
        localStorage.setItem(key, 'true');
      }
    }
  }, [isSubmitted, fileId]);

  useEffect(() => {
    if (location.state?.fromTimelines) {
      setShowTimelinesMessage(true);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  useEffect(() => {
    if (fileId) {
      fetchQuestions(fileId);
      fetchResponses(fileId);
    }
  }, [fileId, fetchQuestions, fetchResponses]);

  const isResponseAnswered = (r: SurveyResponse) =>
    (r.responseText != null && r.responseText.trim() !== '') ||
    r.responseNumber != null ||
    r.responseBoolean != null ||
    (r.responseDate != null && r.responseDate.trim() !== '') ||
    r.multipleChoiceOptionId != null;

  const getSectionQuestionCount = (sectionKey: string) => {
    const sectionConfig = surveySections.find(s => s.key === sectionKey);
    if (!sectionConfig) return { total: 0, answered: 0 };

    // Only count parent questions (not sub-questions) for completion
    const sectionQuestions = questions.filter(
      q => q.questionCategory === sectionConfig.label && q.parentQuestionId == null
    );
    const answeredIds = new Set(responses.filter(isResponseAnswered).map(r => r.questionId));
    const answered = sectionQuestions.filter(q => answeredIds.has(q.questionId)).length;

    return { total: sectionQuestions.length, answered };
  };

  const parentQuestionKeys = new Set(
    questions.filter(q => q.parentQuestionId == null).map(q => `${q.questionId}-${q.propertyTypeId}`)
  );
  const totalQuestions = parentQuestionKeys.size;
  const totalAnswered = responses.filter(r => isResponseAnswered(r) && parentQuestionKeys.has(`${r.questionId}-${r.propertyTypeId}`)).length;

  const isSectionComplete = (sectionKey: string) => {
    const { total, answered } = getSectionQuestionCount(sectionKey);
    return total > 0 && answered >= total;
  };

  const handleDownloadPdf = async () => {
    if (!fileId) return;
    setDownloadingPdf(true);
    try {
      const url = isSubmitted
        ? '/client/file-numbers/active/survey/pdf'
        : '/client/file-numbers/active/survey/pdf?blank=true';
      const res = await api.rawFetch(url);
      if (!res.ok) {
        let message = `Download failed (${res.status})`;
        try {
          const data = await res.json();
          if (data?.error) message = data.error;
        } catch {
          // ignore
        }
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

  if (srLoading || loading) return <LoadingSpinner />;

  if (!fileId) {
    return (
      <div className="survey-page">
        <h1>Surveys</h1>
        <NoFileNumberState />
      </div>
    );
  }

  return (
    <div className="survey-page">
      <div className="survey-page-header">
        <h1>Surveys</h1>
        {totalQuestions > 0 && (
          <button
            type="button"
            className="btn-primary"
            onClick={handleDownloadPdf}
            disabled={!fileId || downloadingPdf}
          >
            {downloadingPdf ? 'Downloading...' : isSubmitted ? 'Download Submitted Answers' : 'Download Survey'}
          </button>
        )}
      </div>
      <p className="page-subtitle">
        Based on your input information, you will need to complete the following survey sections
      </p>

      {showTimelinesMessage && (
        <div className="timelines-redirect-banner">
          <span>Thank you for confirming your timelines, please complete required survey questions to start the process</span>
          <button
            className="timelines-redirect-banner__dismiss"
            onClick={() => setShowTimelinesMessage(false)}
            aria-label="Dismiss message"
          >
            &times;
          </button>
        </div>
      )}

      <SurveyProgressBar answered={totalAnswered} total={totalQuestions} />

      <div className="survey-section-list">
        {surveySections.filter(section => {
          const { total } = getSectionQuestionCount(section.key);
          return total > 0;
        }).map((section) => {
          const complete = isSectionComplete(section.key);
          const isExpanded = expandedSections.has(section.key);
          const sectionQs = isSubmitted
            ? questions.filter(q => q.questionCategory === section.label && q.parentQuestionId == null)
            : [];

          return (
            <div key={section.key} className="survey-section-group">
              <div
                className="survey-section-item"
                onClick={() => handleSectionClick(section.key)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSectionClick(section.key)}
              >
                <div className="section-info">
                  <span className="section-label">
                    {isSubmitted && (
                      <span className={`survey-section-arrow${isExpanded ? ' expanded' : ''}`}>▶</span>
                    )}
                    {section.label}
                  </span>
                  <span className="section-description">{section.description}</span>
                </div>
                <span className={`section-status ${complete ? 'complete' : 'incomplete'}`}>
                  {complete ? 'Complete' : 'Incomplete'}
                </span>
              </div>
              {isSubmitted && isExpanded && (
                <div className="survey-section-answers">
                  {sectionQs.map((q, i) => {
                    const response = responses.find(r => r.questionId === q.questionId);
                    return (
                      <div key={q.fnSurveyQuestionId} className="survey-answer-row">
                        <span className="survey-answer-row__question">{i + 1}. {q.questionText}</span>
                        <span className="survey-answer-row__answer">{formatAnswer(q, response)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isSubmitted && (
        <p className="survey-change-note">
          If you need to change your answers, please email clientcare@stratareserveplanning.com
        </p>
      )}

      <Modal
        isOpen={showThankYou}
        onClose={() => setShowThankYou(false)}
        title="Thank You"
        size="medium"
        footer={
          <button className="btn-primary" onClick={() => setShowThankYou(false)}>
            Close
          </button>
        }
      >
        <div className="thank-you-content">
          <p>
            {(activeRequest?.clientPropertyTypes?.length ?? 0) < (activeRequest?.strata?.strataPropertyTypes?.length ?? 0)
              ? 'Thank you for submitting your survey answers. Once all sections of your property have finalized their submissions, a strata reserve planning team member will review your file.'
              : 'Thank you for submitting your survey answers. Once your documents are also finalized, a strata reserve planning team member will review your submissions within 3–5 business days.'}
          </p>
        </div>
      </Modal>
    </div>
  );
}

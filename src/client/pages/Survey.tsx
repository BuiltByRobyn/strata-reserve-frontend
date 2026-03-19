import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useSurvey } from '../../shared/hooks/useSurvey';
import { useClientFileNumber } from '../../shared/hooks/useClientFileNumber';
import { useApiClient } from '../../shared/hooks/useApiClient';
import { SurveyProgressBar } from '../../shared/components/SurveyProgressBar';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { Modal } from '../../shared/components/Modal';
import { NoFileNumberState } from '../../shared/components/NoFileNumberState';
import { getFilenameFromDisposition, triggerBlobDownload } from '../../shared/utils/fileUtils';
import {
  SURVEY_SECTIONS,
} from '../../shared/types/survey.types';

export default function SurveyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeRequest, fileId, loading: srLoading } = useClientFileNumber();
  const { questions, responses, loading, fetchQuestions, fetchResponses } = useSurvey();
  const api = useApiClient();

  const [showThankYou, setShowThankYou] = useState(false);
  const [showTimelinesMessage, setShowTimelinesMessage] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const isSubmitted = !!activeRequest?.submittedForReviewDate;

  useEffect(() => {
    if (isSubmitted) {
      setShowThankYou(true);
    }
  }, [isSubmitted]);

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

  const getSectionQuestionCount = (sectionKey: string) => {
    const sectionConfig = SURVEY_SECTIONS.find(s => s.key === sectionKey);
    if (!sectionConfig) return { total: 0, answered: 0 };

    // Only count parent questions (not sub-questions) for completion
    const sectionQuestions = questions.filter(
      q => q.questionCategory === sectionConfig.label && q.parentQuestionId == null
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

  const handleDownloadPdf = async () => {
    if (!fileId) return;
    setDownloadingPdf(true);
    try {
      const res = await api.rawFetch('/client/file-numbers/active/survey/pdf');
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
            {downloadingPdf ? 'Downloading...' : 'Download Survey'}
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
        {SURVEY_SECTIONS.filter(section => {
          const { total } = getSectionQuestionCount(section.key);
          return total > 0;
        }).map((section) => {
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
                {complete ? 'Complete' : 'Incomplete'}
              </span>
            </div>
          );
        })}
      </div>

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
          <p>Thank you for submitting your survey answers. Please submit your documents to finalize your report.</p>
        </div>
      </Modal>
    </div>
  );
}

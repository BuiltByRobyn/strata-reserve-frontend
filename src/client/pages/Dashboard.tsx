import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useClientAppointments } from '../../shared/hooks/useClientAppointments';
import { useClientDocuments } from '../../shared/hooks/useClientDocuments';
import { useClientFileNumber } from '../../shared/hooks/useClientFileNumber';
import { usePropertyTypeRequest } from '../../shared/hooks/usePropertyTypeRequest';
import { useSurvey } from '../../shared/hooks/useSurvey';
import { useTimelines } from '../../shared/hooks/useTimelines';
import { parseLocalDate, parseTimestamp } from '../../shared/lib/dateUtils';
import type { ActiveAppointmentResponse } from '../../shared/types/appointment.types';
import { SURVEY_SECTIONS } from '../../shared/types/survey.types';

const formatShortDate = (value: string | null | undefined) => {
  const date = parseLocalDate(value) || parseTimestamp(value);
  if (!date) return 'TBD';
  return date.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeRequest, fileNumberId, loading: requestLoading } = useClientFileNumber();
  const { loading: propertyTypeLoading } = usePropertyTypeRequest();
  const { timelines, loading: timelinesLoading } = useTimelines(fileNumberId);
  const { questions, responses, loading: surveyLoading, fetchQuestions, fetchResponses } = useSurvey();
  const {
    requiredDocuments,
    loading: documentsLoading,
    fetchRequiredDocuments,
  } = useClientDocuments();
  const { getActiveAppointment } = useClientAppointments();

  const [activeAppointment, setActiveAppointment] = useState<ActiveAppointmentResponse>(null);
  const [appointmentLoading, setAppointmentLoading] = useState(true);

  useEffect(() => {
    if (!fileNumberId) {
      setAppointmentLoading(false);
      setActiveAppointment(null);
      return;
    }

    let ignore = false;
    setAppointmentLoading(true);

    getActiveAppointment().then((appointment) => {
      if (ignore) return;
      setActiveAppointment(appointment);
    }).finally(() => {
      if (!ignore) setAppointmentLoading(false);
    });

    return () => { ignore = true; };
  }, [fileNumberId, getActiveAppointment]);

  useEffect(() => {
    if (!fileNumberId) return;
    fetchQuestions(fileNumberId);
    fetchResponses(fileNumberId);
    fetchRequiredDocuments(fileNumberId);
  }, [fetchQuestions, fetchRequiredDocuments, fetchResponses, fileNumberId]);

  const welcomeName = user?.role === 'client' ? user.firstName || 'there' : 'there';
  const dashboardTitle = activeRequest?.strata?.complexName || activeRequest?.strata?.strataPlan || 'Your Strata Reserve project';

  const clientPropertyTypeIds = useMemo(
    () => activeRequest?.clientPropertyTypes?.map((pt) => pt.propertyTypeId) || [],
    [activeRequest],
  );

  const filteredRequiredDocuments = useMemo(() => {
    if (clientPropertyTypeIds.length === 0) {
      return requiredDocuments.filter((doc) => !doc.propertyType);
    }
    return requiredDocuments.filter((doc) =>
      !doc.propertyType || clientPropertyTypeIds.includes(doc.propertyType.propertyTypeId),
    );
  }, [clientPropertyTypeIds, requiredDocuments]);

  const requiredDocumentCount = useMemo(
    () => filteredRequiredDocuments.filter((doc) => doc.isRequired).length,
    [filteredRequiredDocuments],
  );

  const uploadedRequiredDocumentCount = useMemo(
    () => filteredRequiredDocuments.filter((doc) => doc.isRequired && doc.uploadedDocument).length,
    [filteredRequiredDocuments],
  );

  const missingRequiredDocumentCount = Math.max(requiredDocumentCount - uploadedRequiredDocumentCount, 0);

  const sectionProgress = useMemo(() => {
    const answeredQuestionIds = new Set(responses.map((r) => r.questionId));
    return SURVEY_SECTIONS
      .map((section) => {
        const parentQuestions = questions.filter(
          (q) => q.questionCategory === section.label && q.parentQuestionId == null,
        );
        const answeredCount = parentQuestions.filter((q) => answeredQuestionIds.has(q.questionId)).length;
        return {
          ...section,
          total: parentQuestions.length,
          answered: answeredCount,
          complete: parentQuestions.length > 0 && answeredCount >= parentQuestions.length,
        };
      })
      .filter((s) => s.total > 0);
  }, [questions, responses]);

  const totalSurveyQuestions = sectionProgress.reduce((acc, s) => acc + s.total, 0);
  const answeredSurveyQuestions = sectionProgress.reduce((acc, s) => acc + s.answered, 0);
  const timelineTargetDate = timelines?.targetDate || activeRequest?.targetDate || null;

  const overallPct = useMemo(() => {
    const total = totalSurveyQuestions + requiredDocumentCount;
    if (total === 0) return 0;
    return Math.round(((answeredSurveyQuestions + uploadedRequiredDocumentCount) / total) * 100);
  }, [answeredSurveyQuestions, totalSurveyQuestions, uploadedRequiredDocumentCount, requiredDocumentCount]);

  const tasks = useMemo(() => {
    const incompleteSectionKey = sectionProgress.find((s) => !s.complete)?.key;
    const surveyPath = incompleteSectionKey ? `/client/survey/${incompleteSectionKey}` : '/client/survey';

    const bookingActionNeeded = !!(activeRequest?.rebookingRequestedAt || (activeRequest?.appointmentOfferedAt && !activeAppointment));

    // When booking action is needed, replace Deadlines with the inspection card
    if (bookingActionNeeded) {
      const inspectionTitle = activeRequest?.rebookingRequestedAt ? 'Rebook Your Inspection' : 'Book Your Inspection';
      const inspectionDesc = activeRequest?.rebookingRequestedAt
        ? 'Your previous appointment was cancelled. Please choose new preferred dates.'
        : 'Appointment booking is open. Select your preferred dates to continue.';
      const inspectionLabel = activeRequest?.rebookingRequestedAt ? 'Book Inspection Date' : 'Select Dates';

      return [
        { id: 'inspection', title: inspectionTitle, description: inspectionDesc, buttonLabel: inspectionLabel, path: '/client/inspection-date', navState: undefined },
        {
          id: 'survey',
          title: activeRequest?.submittedForReviewDate ? 'Review Your Survey' : 'Complete Your Survey',
          description: activeRequest?.submittedForReviewDate ? 'Your survey has been submitted for review.' : 'Continue where you left off',
          buttonLabel: activeRequest?.submittedForReviewDate ? 'Review Survey' : 'Open Survey',
          path: surveyPath,
          navState: undefined,
        },
        {
          id: 'documents',
          title: 'Upload Documents',
          description: missingRequiredDocumentCount > 0
            ? `${missingRequiredDocumentCount} required document${missingRequiredDocumentCount === 1 ? '' : 's'} still to upload`
            : 'Submit required forms',
          buttonLabel: missingRequiredDocumentCount > 0 ? 'Upload Documents' : 'View Documents',
          path: '/client/documents',
          navState: undefined,
        },
      ];
    }

    return [
      {
        id: 'survey',
        title: activeRequest?.submittedForReviewDate ? 'Review Your Survey' : 'Complete Your Survey',
        description: activeRequest?.submittedForReviewDate ? 'Your survey has been submitted for review.' : 'Continue where you left off',
        buttonLabel: activeRequest?.submittedForReviewDate ? 'Review Survey' : 'Open Survey',
        path: surveyPath,
        navState: undefined,
      },
      {
        id: 'documents',
        title: 'Upload Documents',
        description: missingRequiredDocumentCount > 0
          ? `${missingRequiredDocumentCount} required document${missingRequiredDocumentCount === 1 ? '' : 's'} still to upload`
          : 'Submit required forms',
        buttonLabel: missingRequiredDocumentCount > 0 ? 'Upload Documents' : 'View Documents',
        path: '/client/documents',
        navState: undefined,
      },
      {
        id: 'timelines',
        title: 'Deadlines',
        description: timelineTargetDate
          ? `Target: ${formatShortDate(timelineTargetDate)}`
          : 'View cut off dates and updates on your report',
        buttonLabel: 'View Timeline',
        path: '/client/timelines',
        navState: { scrollToDeadlines: true } as Record<string, unknown>,
      },
    ];
  }, [activeAppointment, activeRequest, missingRequiredDocumentCount, sectionProgress, timelineTargetDate]);

  const dashboardLoading = requestLoading || propertyTypeLoading || surveyLoading || documentsLoading || timelinesLoading || appointmentLoading;

  if (dashboardLoading) return <LoadingSpinner />;

  if (!activeRequest) {
    return (
      <div className="client-dashboard">
        <div className="dashboard-welcome">
          <h1>Welcome, {welcomeName}</h1>
          <p className="dashboard-subtitle">Dashboard</p>
        </div>
        <div className="dashboard-surface">
          <section className="dashboard-section">
            <div className="empty-actions empty-actions--spacious">
              <p>No active service request was found for your account. Please contact the SRP team for help.</p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="client-dashboard">
      <div className="dashboard-welcome">
        <h1>Welcome, {welcomeName}</h1>
        <p className="dashboard-subtitle">{dashboardTitle}</p>
      </div>

      <div className="client-progress-card">
        <div className="client-progress-card__top">
          <div className="client-progress-card__title-wrap">
            <span className="client-progress-card__title">Your Progress</span>
            <span className="client-progress-card__subtitle">
              {overallPct === 100 ? 'All steps complete!' : "You're making great progress!"}
            </span>
          </div>
          <div className="client-progress-card__pct-wrap">
            <span className="client-progress-card__pct">{overallPct}%</span>
            <span className="client-progress-card__pct-label">Complete</span>
          </div>
        </div>
        <div className="client-progress-bar-track">
          <div className="client-progress-bar-fill" style={{ width: `${overallPct}%` }} />
        </div>
        <div className="client-progress-card__stats">
          {totalSurveyQuestions > 0 && (
            <span>Questions: {answeredSurveyQuestions}/{totalSurveyQuestions} completed</span>
          )}
          {requiredDocumentCount > 0 && (
            <span>Documents: {uploadedRequiredDocumentCount}/{requiredDocumentCount} uploaded</span>
          )}
        </div>
      </div>

      <h2 className="client-tasks-heading">Priority Tasks</h2>
      <div className="priority-tasks-grid">
        {tasks.map((task, index) => (
          <div key={task.id} className={`priority-task-card${index === 0 ? ' priority-task-card--active' : ''}`}>
            <h3 className="priority-task-card__title">{task.title}</h3>
            <p className="priority-task-card__desc">{task.description}</p>
            <button
              className={`btn-action ${index === 0 ? 'btn-action--primary' : 'btn-action--secondary'}`}
              onClick={() => navigate(task.path, { state: task.navState })}
            >
              {task.buttonLabel}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

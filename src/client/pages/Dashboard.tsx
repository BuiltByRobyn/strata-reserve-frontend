import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { NoFileNumberState } from '../../shared/components/NoFileNumberState';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useClientAppointments } from '../../shared/hooks/useClientAppointments';
import { useClientDocuments } from '../../shared/hooks/useClientDocuments';
import { useClientFileNumber } from '../../shared/hooks/useClientFileNumber';
import { usePropertyTypeRequest } from '../../shared/hooks/usePropertyTypeRequest';
import { useSurvey } from '../../shared/hooks/useSurvey';
import { useTimelines } from '../../shared/hooks/useTimelines';
import { parseLocalDate, parseTimestamp } from '../../shared/lib/dateUtils';
import type { ActiveAppointmentResponse, AppointmentNotification } from '../../shared/types/appointment.types';
import { SURVEY_SECTIONS } from '../../shared/types/survey.types';

const formatShortDate = (value: string | null | undefined) => {
  const date = parseLocalDate(value) || parseTimestamp(value);
  if (!date) return 'TBD';
  return date.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeRequest, fileId, loading: requestLoading } = useClientFileNumber();
  const { loading: propertyTypeLoading } = usePropertyTypeRequest();
  const { timelines, loading: timelinesLoading } = useTimelines(fileId);
  const { questions, responses, loading: surveyLoading, fetchQuestions, fetchResponses } = useSurvey();
  const {
    requiredDocuments,
    loading: documentsLoading,
    fetchRequiredDocuments,
  } = useClientDocuments();
  const { getActiveAppointment, getNotifications } = useClientAppointments();

  const [activeAppointment, setActiveAppointment] = useState<ActiveAppointmentResponse>(null);
  const [appointmentLoading, setAppointmentLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppointmentNotification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!fileId) {
      setAppointmentLoading(false);
      setActiveAppointment(null);
      return;
    }

    let ignore = false;
    setAppointmentLoading(true);

    Promise.all([
      getActiveAppointment(),
      getNotifications(),
    ]).then(([appointment, notifs]) => {
      if (ignore) return;
      setActiveAppointment(appointment);
      setNotifications(notifs);
    }).finally(() => {
      if (!ignore) setAppointmentLoading(false);
    });

    return () => { ignore = true; };
  }, [fileId, getActiveAppointment, getNotifications]);

  useEffect(() => {
    if (!fileId) return;
    fetchQuestions(fileId);
    fetchResponses(fileId);
    fetchRequiredDocuments(fileId);
  }, [fetchQuestions, fetchRequiredDocuments, fetchResponses, fileId]);

  const welcomeName = user?.role === 'client' ? user.firstName || 'there' : 'there';
  const dashboardTitle = activeRequest?.strata?.complexName || activeRequest?.strata?.strataPlan || 'Your Strata Reserve Planning - Data Collection Portal';

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

  const surveyCompleted = totalSurveyQuestions > 0 && answeredSurveyQuestions >= totalSurveyQuestions;
  const documentsCompleted = requiredDocumentCount > 0 && missingRequiredDocumentCount === 0;

  const tasks = useMemo(() => {
    const incompleteSectionKey = sectionProgress.find((s) => !s.complete)?.key;
    const surveyPath = incompleteSectionKey ? `/client/survey/${incompleteSectionKey}` : '/client/survey';

    const bookingActionNeeded = !!(
      activeAppointment?.type !== 'completed_draft' &&
      (activeRequest?.rebookingRequestedAt || (activeRequest?.appointmentOfferedAt && !activeAppointment))
    );

    const surveyTask = {
      id: 'survey',
      title: activeRequest?.submittedForReviewDate ? 'Review Your Survey' : 'Complete Your Survey',
      description: activeRequest?.submittedForReviewDate ? 'Your survey has been submitted for review.' : 'Continue where you left off',
      buttonLabel: activeRequest?.submittedForReviewDate ? 'Review Survey' : 'Open Survey',
      path: surveyPath,
      navState: undefined as Record<string, unknown> | undefined,
      completed: surveyCompleted,
    };

    const documentsTask = {
      id: 'documents',
      title: 'Upload Documents',
      description: missingRequiredDocumentCount > 0
        ? `${missingRequiredDocumentCount} required document${missingRequiredDocumentCount === 1 ? '' : 's'} still to upload`
        : 'Submit requested documents',
      buttonLabel: missingRequiredDocumentCount > 0 ? 'Upload Documents' : 'View Documents',
      path: '/client/documents',
      navState: undefined as Record<string, unknown> | undefined,
      completed: documentsCompleted,
    };

    if (bookingActionNeeded) {
      const inspectionTitle = activeRequest?.rebookingRequestedAt ? 'Rebook Your Inspection' : 'Book Your Inspection';
      const inspectionDesc = activeRequest?.rebookingRequestedAt
        ? 'Your previous appointment was cancelled. Please choose new preferred dates.'
        : 'Appointment booking is open. Select your preferred dates to continue.';
      const inspectionLabel = activeRequest?.rebookingRequestedAt ? 'Book Inspection Date' : 'Select Dates';

      return [
        surveyTask,
        documentsTask,
        { id: 'inspection', title: inspectionTitle, description: inspectionDesc, buttonLabel: inspectionLabel, path: '/client/inspection-date', navState: undefined as Record<string, unknown> | undefined, completed: false },
      ];
    }

    return [
      surveyTask,
      documentsTask,
      {
        id: 'timelines',
        title: 'Deadlines',
        description: timelineTargetDate
          ? `Target: ${formatShortDate(timelineTargetDate)}`
          : 'View cut off dates and updates on your report',
        buttonLabel: 'View Timeline',
        path: '/client/timelines',
        navState: { scrollToDeadlines: true } as Record<string, unknown> | undefined,
        completed: timelineTargetDate != null,
      },
    ];
  }, [activeAppointment, activeRequest, documentsCompleted, missingRequiredDocumentCount, sectionProgress, surveyCompleted, timelineTargetDate]);

  const dashboardLoading = requestLoading || propertyTypeLoading || surveyLoading || documentsLoading || timelinesLoading || appointmentLoading;

  if (dashboardLoading) return <LoadingSpinner />;

  if (!activeRequest) {
    return (
      <div className="client-dashboard">
        <div className="dashboard-welcome">
          <h1>Welcome, {welcomeName}</h1>
          <p className="dashboard-subtitle">Dashboard</p>
        </div>
        <NoFileNumberState />
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
        {tasks.map((task) => (
          <div key={task.id} className={`priority-task-card${task.completed ? ' priority-task-card--active' : ''}`}>
            <h3 className="priority-task-card__title">{task.title}</h3>
            <p className="priority-task-card__desc">{task.description}</p>
            <button
              className="btn-action btn-action--secondary"
              onClick={() => navigate(task.path, { state: task.navState })}
            >
              {task.buttonLabel}
            </button>
          </div>
        ))}
      </div>

      {activeAppointment?.type === 'pending_request' && (
        <div className="appointment-status-card appointment-status-card--pending">
          <p className="appointment-status-card__label">PENDING REVIEW</p>
          <p className="appointment-status-card__text">Your inspection request is awaiting confirmation from our team.</p>
        </div>
      )}

      {activeAppointment?.type === 'scheduled' && (
        <div className="appointment-status-card appointment-status-card--scheduled">
          <p className="appointment-status-card__label">CONFIRMED</p>
          <p className="appointment-status-card__text">
            Your {activeAppointment.data.appointmentType.typeName} on {formatShortDate(activeAppointment.data.appointmentDate)} at {activeAppointment.data.timeSlot.slotName} has been approved.
          </p>
        </div>
      )}

      {notifications.some((n) => !dismissed.has(`${n.type}__${n.date}`)) && (
        <div className="client-notifications">
          {notifications
            .filter((n) => !dismissed.has(`${n.type}__${n.date}`))
            .map((n) => {
              const key = `${n.type}__${n.date}`;
              const toneMap = {
                request_approved: 'upcoming',
                request_rejected: 'overdue',
                appointment_cancelled: 'overdue',
                appointment_rescheduled: 'due-today',
              } as const;
              const badgeMap = {
                request_approved: 'APPROVED',
                request_rejected: 'REJECTED',
                appointment_cancelled: 'CANCELLED',
                appointment_rescheduled: 'RESCHEDULED',
              } as const;
              const tone = toneMap[n.type];
              return (
                <div key={key} className={`action-card action-card--${tone}`} onClick={() => navigate('/client/inspection-date')}>
                  <div className="action-card-header">
                    <span className={`urgency-badge urgency-badge--${tone}`}>{badgeMap[n.type]}</span>
                    <button
                      className="client-notification-dismiss"
                      onClick={(e) => { e.stopPropagation(); setDismissed((prev) => new Set(prev).add(key)); }}
                      aria-label="Dismiss"
                    >
                      ×
                    </button>
                  </div>
                  <p className="action-card-title">{n.message}</p>
                  {n.reason && <p className="action-card-desc">{n.reason}</p>}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

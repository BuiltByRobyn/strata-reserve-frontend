import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useClientFileNumber } from '../../shared/hooks/useClientFileNumber';
import { useClientAppointments } from '../../shared/hooks/useClientAppointments';
import { useTimelines } from '../../shared/hooks/useTimelines';
import { useLookups } from '../../shared/hooks/useLookups';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { formatDateLong, formatTime12h, getUserDisplayName } from '../../shared/utils/formatters';
import BookingCalendar from '../../shared/components/BookingCalendar';
import AvailableMeetingDates from '../components/AvailableMeetingDates';
import BookingConfirmation from '../components/BookingConfirmation';
import { Toast } from '../../shared/components/Toast';
import type { AvailableDay, AvailableSlot, BookingChoice, BookingStep, ActiveAppointmentResponse, CalendarMilestone } from '../../shared/types/appointment.types';
import { isWithin48Hours } from '../../shared/utils/availabilityUtils';

/** Next anniversary of baseDate strictly after referenceDate */
function getNextAnniversary(baseDate: Date, referenceDate: Date): Date {
  const month = baseDate.getMonth();
  const day = baseDate.getDate();
  let year = referenceDate.getFullYear();

  for (let i = 0; i < 10; i++) {
    const candidate = new Date(year, month, day);
    if (candidate.getMonth() !== month) {
      // Clamp (e.g. Feb 29 in non-leap year)
      const clamped = new Date(year, month + 1, 0);
      if (clamped > referenceDate) return clamped;
    } else if (candidate > referenceDate) {
      return candidate;
    }
    year++;
  }
  return new Date(referenceDate.getFullYear() + 1, month, day);
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const InspectionDate = () => {
  const { activeRequest, loading: srLoading } = useClientFileNumber();
  const {
    getAvailability,
    getActiveAppointment,
    createRequest,
    cancelRequest,
    cancelAppointment,
  } = useClientAppointments();
  const { appointmentTypes } = useLookups();

  const fileId = activeRequest?.fileId ?? null;
  const { timelines } = useTimelines(fileId);

  const [activeAppointment, setActiveAppointment] = useState<ActiveAppointmentResponse>(null);
  const [availability, setAvailability] = useState<AvailableDay[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);

  const [bookingStep, setBookingStep] = useState<BookingStep>('first-date');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [firstChoice, setFirstChoice] = useState<BookingChoice | null>(null);
  const [secondChoice, setSecondChoice] = useState<BookingChoice | null>(null);
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [cancellingRequest, setCancellingRequest] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const isOffered = !!activeRequest?.appointmentOfferedAt;
  const needsOfferCalendar = isOffered || !!activeRequest?.rebookingRequestedAt;
  const offeredAppointmentType = useMemo(
    () => appointmentTypes.find(t => t.appointmentTypeId === activeRequest?.appointmentOfferTypeId) || null,
    [appointmentTypes, activeRequest?.appointmentOfferTypeId]
  );

  const effectiveAppointmentType = useMemo(() => {
    if (activeAppointment?.type === 'scheduled') return activeAppointment.data.appointmentType;
    if (activeAppointment?.type === 'pending_request') return activeAppointment.data.appointmentType;
    return null;
  }, [activeAppointment]);

  const hasCompletedNonDraftInspection = useMemo(
    () =>
      activeRequest?.appointments?.some(
        (a) => a.status === 'Completed' && a.appointmentType?.isDraftMeeting === false
      ) ?? false,
    [activeRequest?.appointments]
  );
  const hasCompletedDraftMeeting = useMemo(
    () =>
      activeRequest?.appointments?.some(
        (a) => a.status === 'Completed' && a.appointmentType?.isDraftMeeting === true
      ) ?? false,
    [activeRequest?.appointments]
  );

  const draftTypeFromLookups = useMemo(
    () => appointmentTypes.find((t) => t.isDraftMeeting) ?? null,
    [appointmentTypes]
  );

  const bookingDraftMeeting = useMemo(() => {
    if (offeredAppointmentType?.isDraftMeeting) return true;
    if (activeRequest?.appointmentOfferType?.isDraftMeeting) return true;
    if (effectiveAppointmentType?.isDraftMeeting) return true;
    if (hasCompletedNonDraftInspection && !hasCompletedDraftMeeting) return true;
    return false;
  }, [
    offeredAppointmentType,
    activeRequest?.appointmentOfferType,
    effectiveAppointmentType,
    hasCompletedNonDraftInspection,
    hasCompletedDraftMeeting,
  ]);

  const resolvedTypeForBookingRequest = useMemo(() => {
    if (!bookingDraftMeeting) return offeredAppointmentType;
    if (offeredAppointmentType?.isDraftMeeting) return offeredAppointmentType;
    if (activeRequest?.appointmentOfferType?.isDraftMeeting && offeredAppointmentType) {
      return offeredAppointmentType;
    }
    return draftTypeFromLookups ?? offeredAppointmentType;
  }, [
    bookingDraftMeeting,
    offeredAppointmentType,
    activeRequest?.appointmentOfferType,
    draftTypeFromLookups,
  ]);

  const offeredIsFullDay = useMemo(() => {
    if (bookingDraftMeeting) return false;
    const duration = (
      offeredAppointmentType?.durationType
      || effectiveAppointmentType?.durationType
      || ''
    ).toLowerCase();
    return duration === 'full day';
  }, [bookingDraftMeeting, offeredAppointmentType, effectiveAppointmentType]);

  const hasFetchedAppointment = useRef(false);
  const hasFetchedAvailability = useRef(false);
  const prevAppointmentTypeRef = useRef<string | null>(null);
  const prevBookingDraftMeetingRef = useRef<boolean | null>(null);
  const meetingDatesRef = useRef<HTMLDivElement>(null);

const loadActiveAppointment = useCallback(async () => {
    const data = await getActiveAppointment();
    setActiveAppointment(data);
  }, [getActiveAppointment]);

  // Effect 1: Load active appointment (once, when file number loads)
  useEffect(() => {
    if (srLoading) return;
    if (!activeRequest) {
      setPageLoading(false);
      setCalendarLoading(false);
      return;
    }
    if (hasFetchedAppointment.current) return;
    hasFetchedAppointment.current = true;
    loadActiveAppointment().then(() => {
      const needsCalendar = !!activeRequest.appointmentOfferedAt || !!activeRequest.rebookingRequestedAt;
      if (!needsCalendar) {
        setCalendarLoading(false);
      }
    }).finally(() => setPageLoading(false));
  }, [srLoading, activeRequest, loadActiveAppointment]);

  const loadAvailability = useCallback(async (isDraft = false) => {
    if (!fileId) return;
    setCalendarLoading(true);
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 3);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    const data = await getAvailability(startStr, endStr, fileId, isDraft);
    setAvailability(data);
    setCalendarLoading(false);
  }, [fileId, getAvailability]);

  useEffect(() => {
    const currentType = activeAppointment?.type ?? null;
    if (prevAppointmentTypeRef.current === 'scheduled' && currentType === null) {
      hasFetchedAvailability.current = false;
    }
    prevAppointmentTypeRef.current = currentType;
  }, [activeAppointment]);

  useEffect(() => {
    if (!needsOfferCalendar || !fileId || pageLoading || hasFetchedAvailability.current) return;
    if (activeAppointment?.type === 'completed_draft') {
      setCalendarLoading(false);
      return;
    }
    hasFetchedAvailability.current = true;
    loadAvailability(bookingDraftMeeting);
  }, [needsOfferCalendar, activeAppointment, fileId, pageLoading, loadAvailability, bookingDraftMeeting]);

  // When draft mode flips (e.g. inspection marked completed), refetch 7pm slots instead of half-day slots
  useEffect(() => {
    if (prevBookingDraftMeetingRef.current === null) {
      prevBookingDraftMeetingRef.current = bookingDraftMeeting;
      return;
    }
    if (prevBookingDraftMeetingRef.current === bookingDraftMeeting) return;
    prevBookingDraftMeetingRef.current = bookingDraftMeeting;
    if (!needsOfferCalendar || !fileId || pageLoading) return;
    if (activeAppointment?.type === 'completed_draft') return;
    loadAvailability(bookingDraftMeeting);
  }, [bookingDraftMeeting, needsOfferCalendar, fileId, pageLoading, activeAppointment?.type, loadAvailability]);

  // Re-fetch availability when user returns to the tab (handles inspector changes by admin)
  useEffect(() => {
    const handleFocus = () => {
      if (needsOfferCalendar && fileId && activeAppointment?.type !== 'pending_request') {
        loadAvailability(bookingDraftMeeting);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [needsOfferCalendar, activeAppointment, fileId, loadAvailability, bookingDraftMeeting]);

  const filteredAvailability = useMemo(() =>
    availability
      .map(day => ({
        ...day,
        slots: day.slots.filter(slot => {
          if (isWithin48Hours(day.date, slot.slotTime)) return false;
          if (bookingDraftMeeting) return slot.slotTime === '19:00';
          if (offeredIsFullDay) return slot.slotTime === '10:00';
          return slot.slotTime === '10:00' || slot.slotTime === '14:00';
        })
      }))
      .filter(day => day.slots.length > 0),
    [availability, bookingDraftMeeting, offeredIsFullDay]
  );

  // Compute timeline milestones for the calendar
  const milestones = useMemo((): CalendarMilestone[] => {
    if (!timelines && !activeRequest?.appointmentOfferedAt) return [];
    const result: CalendarMilestone[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // "File Opened" milestone on the date the appointment was offered
    if (activeRequest?.appointmentOfferedAt) {
      const offeredDate = formatYMD(new Date(activeRequest.appointmentOfferedAt));
      result.push({ date: offeredDate, label: 'Submission Approved' });
    }

    if (!timelines) return result;

    // Determine the effective target date
    let effectiveTargetDate: Date | null = null;

    if (timelines.targetDate) {
      const targetDateStr = timelines.targetDate.split('T')[0];
      effectiveTargetDate = new Date(targetDateStr + 'T00:00:00');
      result.push({ date: targetDateStr, label: 'Target Date' });
    }

    // Next Projected AGM
    const lastAgmDate = timelines.lastAgmDate && !timelines.noAgmToDate
      ? new Date(timelines.lastAgmDate.split('T')[0] + 'T00:00:00')
      : null;
    const fiscalYearEnd = timelines.fiscalYearEnd
      ? new Date(timelines.fiscalYearEnd.split('T')[0] + 'T00:00:00')
      : null;
    const agmBase = lastAgmDate ?? (timelines.noAgmToDate ? fiscalYearEnd : null);
    if (agmBase) {
      const nextAgm = getNextAnniversary(agmBase, today);
      const nextAgmStr = formatYMD(nextAgm);
      if (!result.some(m => m.date === nextAgmStr)) {
        result.push({ date: nextAgmStr, label: 'Projected AGM' });
      }
    }

    // Auto target date (45 days before projected AGM) if no manual target date
    if (!timelines.targetDate && agmBase) {
      const nextAgm = getNextAnniversary(agmBase, today);
      const autoTarget = addDays(nextAgm, -45);
      if (autoTarget >= today) {
        effectiveTargetDate = autoTarget;
        const autoTargetStr = formatYMD(autoTarget);
        if (!result.some(m => m.date === autoTargetStr)) {
          result.push({ date: autoTargetStr, label: 'Target Date' });
        }
      }
    }

    // 7 Days and 14 Days warning milestones before the effective target date
    if (effectiveTargetDate) {
      const sevenDaysBefore = addDays(effectiveTargetDate, -7);
      const fourteenDaysBefore = addDays(effectiveTargetDate, -14);

      if (sevenDaysBefore >= today) {
        const sevenStr = formatYMD(sevenDaysBefore);
        if (!result.some(m => m.date === sevenStr)) {
          result.push({ date: sevenStr, label: '7 Days' });
        }
      }

      if (fourteenDaysBefore >= today) {
        const fourteenStr = formatYMD(fourteenDaysBefore);
        if (!result.some(m => m.date === fourteenStr)) {
          result.push({ date: fourteenStr, label: '14 Days' });
        }
      }
    }

    return result;
  }, [timelines, activeRequest?.appointmentOfferedAt]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setErrorMsg(null);
    setTimeout(() => {
      meetingDatesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // One-click slot selection from AvailableMeetingDates cards
  const handleCardSlotSelect = (date: string, slot: AvailableSlot) => {
    const choice: BookingChoice = {
      date,
      timeSlotId: slot.timeSlotId,
      slotName: slot.slotName,
      slotTime: slot.slotTime,
    };

    if (bookingStep === 'first-date' || bookingStep === 'first-slot') {
      setFirstChoice(choice);
      setSelectedDate(null);
      setBookingStep('second-date');
    } else if (bookingStep === 'second-date' || bookingStep === 'second-slot') {
      setSecondChoice(choice);
      setSelectedDate(null);
      setBookingStep('confirm');
    }
  };

  const handleBackFromConfirm = () => {
    setBookingStep('second-date');
    setSelectedDate(null);
  };

  const handleSubmit = async () => {
    if (!firstChoice || !fileId) return;

    if (!secondChoice) {
      setErrorMsg('Please select a second choice date and time slot');
      return;
    }

    const selectedType = resolvedTypeForBookingRequest;
    if (!selectedType) {
      setErrorMsg('No offered appointment type available');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const result = await createRequest({
      fileId,
      appointmentTypeId: selectedType.appointmentTypeId,
      firstChoiceDate: firstChoice.date,
      firstChoiceTimeSlotId: firstChoice.timeSlotId,
      secondChoiceDate: secondChoice?.date,
      secondChoiceTimeSlotId: secondChoice?.timeSlotId,
      specialRequirements: specialRequirements.trim() || undefined,
    });

    setSubmitting(false);

    if (result.success) {
      setSuccessMsg('Your appointment request has been submitted successfully!');
      resetBooking();
      await loadActiveAppointment();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const msg = result.error || 'Failed to submit request';
      if (msg.includes('no longer available') || msg.includes('Please choose a different')) {
        setToastMsg(msg);
        resetBooking();
        loadAvailability(selectedType.isDraftMeeting);
      } else {
        setErrorMsg(msg);
      }
    }
  };

  const handleCancelRequest = async (requestId: number) => {
    setCancellingRequest(true);
    setErrorMsg(null);
    const result = await cancelRequest(requestId);
    setCancellingRequest(false);

    if (result.success) {
      setSuccessMsg('Your appointment request has been cancelled.');
      await loadActiveAppointment();
      hasFetchedAvailability.current = false;
      loadAvailability(bookingDraftMeeting);
    } else {
      setErrorMsg(result.error || 'Failed to cancel request');
    }
  };

  const handleCancelAppointment = async (appointmentId: number) => {
    setErrorMsg(null);
    const result = await cancelAppointment(appointmentId);
    if (result.success) {
      setSuccessMsg('Your appointment has been cancelled.');
      await loadActiveAppointment();
    } else {
      setErrorMsg(result.error || 'Failed to cancel appointment');
    }
  };

  const resetBooking = () => {
    setBookingStep('first-date');
    setSelectedDate(null);
    setFirstChoice(null);
    setSecondChoice(null);
    setSpecialRequirements('');
  };

  if (srLoading || pageLoading || calendarLoading) {
    return <LoadingSpinner />;
  }

  if (!activeRequest) {
    return (
      <div className="page-container">
        <h1>Inspection Date</h1>
        <div className="inspection-date__card">
          <p>No active file number found.</p>
        </div>
      </div>
    );
  }

  const canAccessInspectionDatePage =
    isOffered
    || activeAppointment?.type === 'scheduled'
    || activeAppointment?.type === 'pending_request'
    || !!activeRequest?.rebookingRequestedAt;

  if (!canAccessInspectionDatePage) {
    return <Navigate to="/client/dashboard" replace />;
  }

  if (activeAppointment?.type === 'completed_draft') {
    return <Navigate to="/client/dashboard" replace />;
  }

  const pendingReq = activeAppointment?.type === 'pending_request' ? activeAppointment.data : null;
  const isPending = pendingReq !== null;
  const hasScheduledAppointment = activeAppointment?.type === 'scheduled';
  const scheduledApt = hasScheduledAppointment ? activeAppointment.data : null;

  const pageTitleForScheduledOrPending = hasScheduledAppointment
    ? (bookingDraftMeeting ? 'Draft Meeting' : 'Inspection Date')
    : isPending
      ? (pendingReq?.appointmentType?.isDraftMeeting ? 'Draft Meeting' : 'Inspection Date')
      : null;

  const bookingTitle = pageTitleForScheduledOrPending != null
    ? pageTitleForScheduledOrPending
    : bookingDraftMeeting ? 'Schedule Draft Meeting' : 'Pick a date for your inspection';
  const bookingSubtitle = hasScheduledAppointment || isPending
    ? null
    : bookingDraftMeeting
      ? 'Select your preferred draft meeting date and time'
      : 'Select a date and time that works for you';

  return (
    <div className="page-container inspection-date-page">
      <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} />
      <h1>{bookingTitle}</h1>
      {bookingSubtitle && <p className="page-subtitle">{bookingSubtitle}</p>}

      {pendingReq && (
        <div className="inspection-date__card inspection-date__card--pending">
          <h3>Appointment Request Pending Review</h3>
          <p>Your appointment request is currently being reviewed by our team.</p>

          <div className="inspection-date__details">
            <div className="inspection-date__detail-row">
              <span className="inspection-date__detail-label">Type</span>
              <span className="inspection-date__detail-value">
                {pendingReq.appointmentType?.typeName || 'Inspection'}
              </span>
            </div>
            <div className="inspection-date__detail-row">
              <span className="inspection-date__detail-label">First Choice</span>
              <span className="inspection-date__detail-value">
                {formatDateLong(pendingReq.firstChoiceDate)} - {pendingReq.firstChoiceTimeSlot?.slotName || ''} ({formatTime12h(pendingReq.firstChoiceTimeSlot?.slotTime || '')})
              </span>
            </div>
            {pendingReq.secondChoiceDate && pendingReq.secondChoiceTimeSlot && (
              <div className="inspection-date__detail-row">
                <span className="inspection-date__detail-label">Second Choice</span>
                <span className="inspection-date__detail-value">
                  {formatDateLong(pendingReq.secondChoiceDate)} - {pendingReq.secondChoiceTimeSlot.slotName} ({formatTime12h(pendingReq.secondChoiceTimeSlot.slotTime)})
                </span>
              </div>
            )}
            {pendingReq.specialRequirements && (
              <div className="inspection-date__detail-row">
                <span className="inspection-date__detail-label">Special Requirements</span>
                <span className="inspection-date__detail-value">{pendingReq.specialRequirements}</span>
              </div>
            )}
            <div className="inspection-date__detail-row">
              <span className="inspection-date__detail-label">Status</span>
              <span className="inspection-date__detail-value inspection-date__status--pending">
                Pending Review
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleCancelRequest(pendingReq.appointmentRequestId)}
            disabled={cancellingRequest}
          >
            {cancellingRequest ? 'Cancelling...' : 'Cancel Request'}
          </button>
        </div>
      )}

      {scheduledApt && (() => {
        const aptDateStr = typeof scheduledApt.appointmentDate === 'string'
          ? scheduledApt.appointmentDate.split('T')[0]
          : new Date(scheduledApt.appointmentDate).toISOString().split('T')[0];
        const appointmentStart = new Date(`${aptDateStr}T${scheduledApt.timeSlot.slotTime}:00Z`);
        const canCancel = appointmentStart.getTime() - Date.now() >= 48 * 60 * 60 * 1000;

        return (
        <div className="inspection-date__card inspection-date__card--scheduled">
          <h3>{bookingDraftMeeting ? 'Draft Meeting Scheduled' : 'Appointment Scheduled'}</h3>

          <div className="inspection-date__details">
            <div className="inspection-date__detail-row">
              <span className="inspection-date__detail-label">Date</span>
              <span className="inspection-date__detail-value">
                {formatDateLong(typeof scheduledApt.appointmentDate === 'string'
                  ? scheduledApt.appointmentDate.split('T')[0]
                  : new Date(scheduledApt.appointmentDate).toISOString().split('T')[0])}
              </span>
            </div>
            <div className="inspection-date__detail-row">
              <span className="inspection-date__detail-label">Time</span>
              <span className="inspection-date__detail-value">
                {scheduledApt.timeSlot.slotName} ({formatTime12h(scheduledApt.timeSlot.slotTime)})
              </span>
            </div>
            <div className="inspection-date__detail-row">
              <span className="inspection-date__detail-label">Type</span>
              <span className="inspection-date__detail-value">
                {scheduledApt.appointmentType.typeName}
              </span>
            </div>
            {scheduledApt.inspector && (
              <div className="inspection-date__detail-row">
                <span className="inspection-date__detail-label">Inspector</span>
                <span className="inspection-date__detail-value">
                  {getUserDisplayName(scheduledApt.inspector)}
                  {scheduledApt.fileNumber?.appointmentOfferSecondInspector && (
                    <>, {getUserDisplayName(scheduledApt.fileNumber.appointmentOfferSecondInspector)}</>
                  )}
                </span>
              </div>
            )}
            <div className="inspection-date__detail-row">
              <span className="inspection-date__detail-label">Status</span>
              <span className="inspection-date__detail-value inspection-date__status--scheduled">
                {scheduledApt.status}
              </span>
            </div>
          </div>

          {canCancel && (
            <div className="inspection-date__actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleCancelAppointment(scheduledApt.appointmentId)}
              >
                Cancel Appointment
              </button>
            </div>
          )}

          <p className="inspection-date__notice">
            Online cancellations must be made at least 48 hours before the appointment.
            For changes within 48 hours, please call SRP at (604) 638-4960.
          </p>
        </div>
        );
      })()}

      {activeRequest?.rebookingRequestedAt && (
        <div className="inspection-date__card inspection-date__card--info" style={{ marginBottom: '1rem' }}>
          <p>Your previous appointment was cancelled. Please select a new inspection date below.</p>
        </div>
      )}

      {errorMsg && <div className="inspection-date__error">{errorMsg}</div>}
      {successMsg && <div className="inspection-date__success">{successMsg}</div>}

      {(() => {
        const canBook = !hasScheduledAppointment && !isPending;
        const bookedDateStr = scheduledApt
          ? (typeof scheduledApt.appointmentDate === 'string'
              ? scheduledApt.appointmentDate.split('T')[0]
              : formatYMD(new Date(scheduledApt.appointmentDate)))
          : null;

        return (
          <div className="inspection-date__booking">
            <div className="inspection-date__calendar-section">
              <BookingCalendar
                variant="client"
                availability={hasScheduledAppointment ? [] : filteredAvailability}
                selectedDate={canBook || isPending ? selectedDate : null}
                onSelectDate={canBook || isPending ? handleDateSelect : () => {}}
                loading={calendarLoading}
                milestones={milestones}
                bookedDate={bookedDateStr}
                bookedTime={scheduledApt?.timeSlot?.slotTime ?? null}
              />
            </div>

            {isPending && (
              <p className="inspection-date__notice">
                Availability is shown for reference only. You cannot book while a request is pending review.
              </p>
            )}

            {(canBook || isPending) && (
              bookingStep === 'confirm' && firstChoice && canBook ? (
                <BookingConfirmation
                  firstChoice={firstChoice}
                  secondChoice={secondChoice}
                  specialRequirements={specialRequirements}
                  onSpecialRequirementsChange={setSpecialRequirements}
                  onConfirm={handleSubmit}
                  onBack={handleBackFromConfirm}
                  submitting={submitting}
                />
              ) : (
                <>
                  {canBook && bookingStep !== 'first-date' && bookingStep !== 'first-slot' && firstChoice && (
                    <div className="inspection-date__first-choice-summary">
                      First Choice: {formatDateLong(firstChoice.date)} - {firstChoice.slotName} ({formatTime12h(firstChoice.slotTime)})
                    </div>
                  )}
                  <AvailableMeetingDates
                    ref={meetingDatesRef}
                    availability={filteredAvailability}
                    onSelectSlot={canBook ? handleCardSlotSelect : () => {}}
                    firstChoice={firstChoice}
                    secondChoice={secondChoice}
                    bookingStep={bookingStep}
                    readOnly={isPending}
                  />
                </>
              )
            )}
          </div>
        );
      })()}

    </div>
  );
};

export default InspectionDate;

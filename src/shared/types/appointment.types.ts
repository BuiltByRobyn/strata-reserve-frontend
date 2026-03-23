import type { AppointmentRequest, AppointmentWithDetails, Appointment, AppointmentType, AppointmentTimeSlot, ProfileBasic } from './entities.types';

export interface AvailableSlot {
  timeSlotId: number;
  slotTime: string;
  slotName: string;
}

export interface AvailableDay {
  date: string;
  slots: AvailableSlot[];
}

export interface BookingChoice {
  date: string;
  timeSlotId: number;
  slotName: string;
  slotTime: string;
}

export interface BookingFormData {
  fileId: number;
  appointmentTypeId: number;
  firstChoice: BookingChoice;
  secondChoice: BookingChoice | null;
  specialRequirements: string;
}

export interface ActiveAppointmentPending {
  type: 'pending_request';
  data: AppointmentRequest;
}

export interface ActiveAppointmentScheduled {
  type: 'scheduled';
  data: Appointment & {
    appointmentType: AppointmentType;
    timeSlot: AppointmentTimeSlot;
    inspector: ProfileBasic | null;
  };
}

export interface ActiveAppointmentCompletedDraft {
  type: 'completed_draft';
}

export type ActiveAppointmentResponse = ActiveAppointmentPending | ActiveAppointmentScheduled | ActiveAppointmentCompletedDraft | null;

export interface ClientAppointmentsState {
  availability: AvailableDay[];
  activeAppointment: ActiveAppointmentResponse;
  draftMeetingEligible: boolean;
  loading: boolean;
  error: string | null;
}

export interface CalendarMilestone {
  date: string;
  label: string;
}

export interface BookingCalendarProps {
  availability: AvailableDay[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  loading: boolean;
  milestones?: CalendarMilestone[];
  bookedDate?: string | null;
  bookedTime?: string | null;
  variant?: 'booking' | 'client' | 'timelines';
  onMilestoneCellClick?: (date: string) => void;
  hideLabels?: boolean;
}

export interface TimeSlotPickerProps {
  slots: AvailableSlot[];
  selectedSlotId: number | null;
  onSelectSlot: (slot: AvailableSlot) => void;
  label: string;
}

export interface BookingConfirmationProps {
  firstChoice: BookingChoice;
  secondChoice: BookingChoice | null;
  specialRequirements: string;
  onSpecialRequirementsChange: (value: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  submitting: boolean;
}

export type BookingStep = 'first-date' | 'first-slot' | 'second-date' | 'second-slot' | 'confirm';

export interface AvailableMeetingDatesProps {
  availability: AvailableDay[];
  onSelectSlot: (date: string, slot: AvailableSlot) => void;
  firstChoice: BookingChoice | null;
  secondChoice: BookingChoice | null;
  bookingStep: BookingStep;
  readOnly?: boolean;
}

export interface UnifiedRow {
  id: string;
  type: 'appointment' | 'request';
  date: string;
  time: string;
  appointmentTypeName: string;
  strataPlan: string;
  strataName: string;
  strataId: number;
  location: string;
  inspectorNames: string;
  inspectorId: string | null;
  status: string;
  original: AppointmentWithDetails | AppointmentRequest;
}

export type SelectedItem =
  | { type: 'appointment'; data: AppointmentWithDetails }
  | { type: 'request'; data: AppointmentRequest };

export interface AppointmentNotification {
  type: 'request_approved' | 'request_rejected' | 'appointment_cancelled' | 'appointment_rescheduled';
  message: string;
  reason: string | null;
  date: string;
}

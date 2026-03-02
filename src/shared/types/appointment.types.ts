import type { AppointmentRequest, Appointment, AppointmentType, AppointmentTimeSlot, ProfileBasic } from './entities.types';

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
  serviceRequestId: number;
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

export type ActiveAppointmentResponse = ActiveAppointmentPending | ActiveAppointmentScheduled | null;

export interface ClientAppointmentsState {
  availability: AvailableDay[];
  activeAppointment: ActiveAppointmentResponse;
  draftMeetingEligible: boolean;
  loading: boolean;
  error: string | null;
}

export interface BookingCalendarProps {
  availability: AvailableDay[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  loading: boolean;
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

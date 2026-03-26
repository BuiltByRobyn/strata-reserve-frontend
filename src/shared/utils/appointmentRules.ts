// Morning slot time in DB (see appointment time slots seed).
export const FULL_DAY_INSPECTION_REQUIRED_SLOT_TIME = '10:00';

// Evening draft-meeting slot in DB (7:00 PM).
export const DRAFT_MEETING_REQUIRED_SLOT_TIME = '19:00';

export function isFullDayInspectionType(type: { typeName?: string } | null | undefined): boolean {
  return type?.typeName === 'Full Day Inspection';
}

export function isDraftMeetingType(type: { isDraftMeeting?: boolean } | null | undefined): boolean {
  return type?.isDraftMeeting === true;
}

export function isAllowedTimeSlotForFullDayInspection(slot: { slotTime?: string } | null | undefined): boolean {
  return slot?.slotTime === FULL_DAY_INSPECTION_REQUIRED_SLOT_TIME;
}

export function isAllowedTimeSlotForDraftMeeting(slot: { slotTime?: string } | null | undefined): boolean {
  return slot?.slotTime === DRAFT_MEETING_REQUIRED_SLOT_TIME;
}

export const FULL_DAY_INSPECTION_SLOT_ERROR =
  'Full Day Inspection appointments are only available for the Morning (10:00 AM) time slot.';

export const DRAFT_MEETING_SLOT_ERROR =
  'Draft Meeting appointments are only available for the 7:00 PM time slot.';

// Inline / submit validation for admin create & reschedule flows.
export function getAppointmentTypeTimeSlotViolationMessage(
  appointmentType: { typeName?: string; isDraftMeeting?: boolean } | null | undefined,
  slot: { slotTime?: string } | null | undefined,
  hasSlotSelected: boolean
): string | null {
  if (!appointmentType || !hasSlotSelected) return null;
  if (isFullDayInspectionType(appointmentType) && !isAllowedTimeSlotForFullDayInspection(slot)) {
    return FULL_DAY_INSPECTION_SLOT_ERROR;
  }
  if (isDraftMeetingType(appointmentType) && !isAllowedTimeSlotForDraftMeeting(slot)) {
    return DRAFT_MEETING_SLOT_ERROR;
  }
  return null;
}

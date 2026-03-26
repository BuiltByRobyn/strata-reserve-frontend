import { formatDateMedium, formatTime12h } from '../../shared/utils/formatters';
import type { AppointmentInfoDisplayProps } from './appointment-info-display.type';

export const AppointmentInfoDisplay = ({
  date,
  slotTime,
  typeName,
  inspectorName,
  secondInspectorName,
  locationName,
}: AppointmentInfoDisplayProps) => (
  <div className="appointment-info-row">
    <div className="appointment-info-row__header">Current Appointment</div>
    <div className="appointment-info-row__grid">
      <div><span className="appointment-info-row__label">Date</span><span>{formatDateMedium(date)}</span></div>
      <div><span className="appointment-info-row__label">Time</span><span>{formatTime12h(slotTime)}</span></div>
      <div><span className="appointment-info-row__label">Appointment Type</span><span>{typeName}</span></div>
      <div><span className="appointment-info-row__label">Inspector</span><span>{inspectorName}</span></div>
      {secondInspectorName && (
        <div><span className="appointment-info-row__label">Additional Inspector</span><span>{secondInspectorName}</span></div>
      )}
      <div><span className="appointment-info-row__label">Location</span><span>{locationName || '-'}</span></div>
    </div>
  </div>
);

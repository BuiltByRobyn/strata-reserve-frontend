export interface AppointmentInfoDisplayProps {
  date: string;
  slotTime: string;
  typeName: string;
  inspectorName: string;
  secondInspectorName?: string | null;
  locationName?: string | null;
}

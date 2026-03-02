import { useState, useEffect } from 'react';
import { useAppointments } from '../../shared/hooks/useAppointments';
import { useUsers } from '../../shared/hooks/useUsers';
import { Tabs } from '../../shared/components/Tabs';
import { DataTable, type Column } from '../../shared/components/DataTable';
import AppointmentRequestReviewModal from '../components/AppointmentRequestReviewModal';
import RescheduleAppointmentModal from '../components/RescheduleAppointmentModal';
import CancelAppointmentModal from '../components/CancelAppointmentModal';
import type { AppointmentWithDetails, AppointmentRequest, AppointmentTimeSlot } from '../../shared/types/entities.types';
import { formatDateShort, formatTime12h } from '../../shared/lib/formatters';

const getStatusClass = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'scheduled': return 'status-scheduled';
    case 'requested':
    case 'pending review': return 'status-requested';
    case 'rejected':
    case 'cancelled': return 'status-rejected';
    case 'completed': return 'status-completed';
    case 'rescheduled': return 'status-rescheduled';
    default: return '';
  }
};

const getInspectorName = (appointment: AppointmentWithDetails): string => {
  if (!appointment.inspector) return 'Unassigned';
  const { firstName, lastName, displayName } = appointment.inspector;
  if (displayName) return displayName;
  return `${firstName || ''} ${lastName || ''}`.trim() || 'Unassigned';
};

const getServiceId = (appointment: AppointmentWithDetails): string => {
  return `#SR-${appointment.serviceRequest.serviceRequestId.toString().padStart(4, '0')}`;
};

const TABS = [
  { key: 'scheduled', label: 'Scheduled Appointments' },
  { key: 'requests', label: 'Pending Requests' },
];

export default function AppointmentsPage() {
  const {
    appointments, loading, error,
    requests, requestsLoading,
    cancelAppointment, rescheduleAppointment,
    fetchAppointmentRequests, reviewAppointmentRequest,
  } = useAppointments();
  const { users } = useUsers();

  const [activeTab, setActiveTab] = useState('scheduled');
  const [reviewRequest, setReviewRequest] = useState<AppointmentRequest | null>(null);
  const [rescheduleApt, setRescheduleApt] = useState<AppointmentWithDetails | null>(null);
  const [cancelApt, setCancelApt] = useState<AppointmentWithDetails | null>(null);
  const [timeSlots, setTimeSlots] = useState<AppointmentTimeSlot[]>([]);

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchAppointmentRequests('Pending Review');
    }
  }, [activeTab, fetchAppointmentRequests]);

  useEffect(() => {
    import('../../shared/hooks/useApiClient').then(() => {
      const slotsFromAppointments = appointments.reduce<AppointmentTimeSlot[]>((acc, apt) => {
        if (!acc.find(s => s.timeSlotId === apt.timeSlot.timeSlotId)) {
          acc.push(apt.timeSlot);
        }
        return acc;
      }, []);
      if (slotsFromAppointments.length > 0) {
        setTimeSlots(slotsFromAppointments);
      }
    });
  }, [appointments]);

  const appointmentColumns: Column<AppointmentWithDetails>[] = [
    { key: 'date', header: 'Date', render: (apt) => formatDateShort(apt.appointmentDate) },
    { key: 'time', header: 'Time', render: (apt) => <strong>{formatTime12h(apt.timeSlot.slotTime)}</strong> },
    { key: 'appointmentType', header: 'Type', render: (apt) => apt.appointmentType.durationType },
    { key: 'strata', header: 'Strata', render: (apt) => apt.serviceRequest.strata.complexName || apt.serviceRequest.strata.strataPlan || '-' },
    { key: 'serviceId', header: 'Service ID', render: (apt) => getServiceId(apt) },
    { key: 'inspector', header: 'Inspector', render: (apt) => getInspectorName(apt) },
    {
      key: 'status', header: 'Status',
      render: (apt) => <span className={`status-badge ${getStatusClass(apt.status)}`}>{apt.status}</span>
    },
  ];

  const requestColumns: Column<AppointmentRequest>[] = [
    {
      key: 'date', header: 'First Choice',
      render: (req) => `${formatDateShort(req.firstChoiceDate)} - ${req.firstChoiceTimeSlot?.slotName || ''}`
    },
    {
      key: 'second', header: 'Second Choice',
      render: (req) => req.secondChoiceDate && req.secondChoiceTimeSlot
        ? `${formatDateShort(req.secondChoiceDate)} - ${req.secondChoiceTimeSlot.slotName}`
        : '-'
    },
    {
      key: 'type', header: 'Type',
      render: (req) => req.appointmentType?.typeName || '-'
    },
    {
      key: 'strata', header: 'Strata',
      render: (req) => {
        const sr = (req as any).serviceRequest;
        return sr?.strata?.complexName || sr?.strata?.strataPlan || '-';
      }
    },
    {
      key: 'requestedBy', header: 'Requested By',
      render: (req) => req.requestedBy?.displayName || `${req.requestedBy?.firstName || ''} ${req.requestedBy?.lastName || ''}`.trim() || '-'
    },
    {
      key: 'status', header: 'Status',
      render: (req) => <span className={`status-badge ${getStatusClass(req.status)}`}>{req.status}</span>
    },
  ];

  const renderAppointmentActions = (apt: AppointmentWithDetails) => {
    const status = apt.status.toLowerCase();
    if (status === 'scheduled' || status === 'rescheduled') {
      return (
        <div className="action-buttons">
          <button className="btn-action btn-reschedule" onClick={() => setRescheduleApt(apt)}>Reschedule</button>
          <button className="btn-action btn-cancel" onClick={() => setCancelApt(apt)}>Cancel</button>
        </div>
      );
    }
    return null;
  };

  const renderRequestActions = (req: AppointmentRequest) => {
    if (req.status === 'Pending Review') {
      return (
        <button className="btn-action btn-view" onClick={() => setReviewRequest(req)}>Review</button>
      );
    }
    return null;
  };

  return (
    <div className="appointments-page">
      <div className="page-header">
        <h1>Appointments</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'scheduled' && (
        <DataTable
          columns={appointmentColumns}
          data={appointments}
          keyExtractor={(apt) => apt.appointmentId}
          loading={loading}
          emptyMessage="No appointments found."
          actions={renderAppointmentActions}
        />
      )}

      {activeTab === 'requests' && (
        <DataTable
          columns={requestColumns}
          data={requests}
          keyExtractor={(req) => req.appointmentRequestId}
          loading={requestsLoading}
          emptyMessage="No pending requests."
          actions={renderRequestActions}
        />
      )}

      <AppointmentRequestReviewModal
        isOpen={!!reviewRequest}
        onClose={() => setReviewRequest(null)}
        request={reviewRequest}
        inspectors={users}
        onReview={reviewAppointmentRequest}
      />

      <RescheduleAppointmentModal
        isOpen={!!rescheduleApt}
        onClose={() => setRescheduleApt(null)}
        appointment={rescheduleApt}
        timeSlots={timeSlots}
        inspectors={users}
        onReschedule={rescheduleAppointment}
      />

      <CancelAppointmentModal
        isOpen={!!cancelApt}
        onClose={() => setCancelApt(null)}
        appointment={cancelApt}
        onCancel={cancelAppointment}
      />
    </div>
  );
}

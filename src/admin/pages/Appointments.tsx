// Appointments Page - Admin management of appointments
import { useAppointments } from '../../shared/hooks/useAppointments';
import { DataTable, type Column } from '../../shared/components/DataTable';
import type { AppointmentWithDetails } from '../../shared/types/entities.types';
import { formatDateShort } from '../../shared/lib/formatters';

// Format time slot - extract time from slotTime (hh:mm:ss) to display as "14:00"
const formatTime = (slotTime: string): string => {
  const [hours, minutes] = slotTime.split(':');
  return `${hours}:${minutes}`;
};

// Get status badge class
const getStatusClass = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'scheduled':
      return 'status-scheduled';
    case 'requested':
    case 'pending review':
      return 'status-requested';
    case 'rejected':
    case 'cancelled':
      return 'status-rejected';
    case 'completed':
      return 'status-completed';
    case 'rescheduled':
      return 'status-rescheduled';
    default:
      return '';
  }
};

// Get inspector display name
const getInspectorName = (appointment: AppointmentWithDetails): string => {
  if (!appointment.inspector) return 'Unassigned';
  const { firstName, lastName, displayName } = appointment.inspector;
  if (displayName) return displayName;
  return `${firstName || ''} ${lastName || ''}`.trim() || 'Unassigned';
};

// Generate service ID display (e.g., "#SR-1044")
const getServiceId = (appointment: AppointmentWithDetails): string => {
  return `#SR-${appointment.serviceRequest.serviceRequestId.toString().padStart(4, '0')}`;
};

export default function AppointmentsPage() {
  const { appointments, loading, error, cancelAppointment } = useAppointments();

  const columns: Column<AppointmentWithDetails>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (apt) => formatDateShort(apt.appointmentDate)
    },
    {
      key: 'time',
      header: 'Time',
      render: (apt) => <strong>{formatTime(apt.timeSlot.slotTime)}</strong>
    },
    {
      key: 'appointmentType',
      header: 'Appointment Type',
      render: (apt) => apt.appointmentType.durationType
    },
    {
      key: 'strata',
      header: 'Strata',
      render: (apt) => apt.serviceRequest.strata.complexName || apt.serviceRequest.strata.strataPlan || '-'
    },
    {
      key: 'serviceId',
      header: 'Service ID',
      render: (apt) => getServiceId(apt)
    },
    {
      key: 'inspector',
      header: 'Inspector',
      render: (apt) => getInspectorName(apt)
    },
    {
      key: 'status',
      header: 'Status',
      render: (apt) => (
        <span className={`status-badge ${getStatusClass(apt.status)}`}>
          {apt.status}
        </span>
      )
    }
  ];

  const handleReschedule = (apt: AppointmentWithDetails) => {
    // For now, just log - implement modal in future
    console.log('Reschedule appointment:', apt.appointmentId);
    alert('Reschedule functionality coming soon!');
  };

  const handleCancel = async (apt: AppointmentWithDetails) => {
    if (!window.confirm(`Are you sure you want to cancel this appointment for ${apt.serviceRequest.strata.complexName || 'this strata'}?`)) {
      return;
    }
    try {
      await cancelAppointment(apt.appointmentId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel appointment');
    }
  };

  const handleViewRequest = (apt: AppointmentWithDetails) => {
    console.log('View request:', apt.appointmentRequestId);
    alert('View Request functionality coming soon!');
  };

  const handleViewDetails = (apt: AppointmentWithDetails) => {
    console.log('View details:', apt.appointmentId);
    alert('View Details functionality coming soon!');
  };

  const renderActions = (apt: AppointmentWithDetails) => {
    const status = apt.status.toLowerCase();
    
    if (status === 'scheduled') {
      return (
        <div className="action-buttons">
          <button className="btn-action btn-reschedule" onClick={() => handleReschedule(apt)}>
            Reschedule
          </button>
          <button className="btn-action btn-cancel" onClick={() => handleCancel(apt)}>
            Cancel
          </button>
        </div>
      );
    }
    
    if (status === 'requested' || status === 'pending review') {
      return (
        <button className="btn-action btn-view" onClick={() => handleViewRequest(apt)}>
          View Request
        </button>
      );
    }
    
    if (status === 'rejected' || status === 'cancelled') {
      return (
        <button className="btn-action btn-view" onClick={() => handleViewDetails(apt)}>
          View Details
        </button>
      );
    }
    
    return null;
  };

  return (
    <div className="appointments-page">
      <div className="page-header">
        <h1>Scheduled Appointments</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <DataTable
        columns={columns}
        data={appointments}
        keyExtractor={(apt) => apt.appointmentId}
        loading={loading}
        emptyMessage="No appointments found."
        actions={renderActions}
      />
    </div>
  );
}

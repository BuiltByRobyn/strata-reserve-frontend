import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext';
import { usePropertyTypeRequests } from '../../shared/hooks/usePropertyTypeRequests';
import { useStrata } from '../../shared/hooks/useStrata';
import { useUsers } from '../../shared/hooks/useUsers';
import { useLookups } from '../../shared/hooks/useLookups';
import { useAppointments } from '../../shared/hooks/useAppointments';
import { Modal } from '../../shared/components/Modal';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import type { PropertyTypeRequest } from '../../shared/types/entities.types';

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { requests, loading: requestsLoading, approveRequest, rejectRequest } = usePropertyTypeRequests();
  const { stratas, loading: stratasLoading } = useStrata();
  const { users, loading: usersLoading } = useUsers();
  const { propertyTypes } = useLookups();
  const { appointments, loading: appointmentsLoading, requests: appointmentRequests, fetchAppointmentRequests } = useAppointments();

  useEffect(() => {
    fetchAppointmentRequests('Pending Review');
  }, [fetchAppointmentRequests]);

  const appointmentsThisWeek = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return appointments.filter(a => {
      if (a.status === 'Cancelled') return false;
      const aptDate = new Date(a.appointmentDate);
      return aptDate >= startOfWeek && aptDate < endOfWeek;
    });
  }, [appointments]);

  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return appointments
      .filter(a => a.status !== 'Cancelled' && new Date(a.appointmentDate) >= now)
      .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())
      .slice(0, 5);
  }, [appointments]);

  const [reviewingRequest, setReviewingRequest] = useState<PropertyTypeRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const adminName = user?.role === 'admin' ? user.fullName : 'Admin';

  const getPropertyTypeNames = (ids: number[]) => {
    return ids
      .map(id => propertyTypes.find(pt => pt.propertyTypeId === id)?.propertyTypeName || `Type ${id}`)
      .join(', ');
  };

  const getTimeSince = (dateStr: string) => {
    const now = new Date();
    const created = new Date(dateStr);
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  const getUrgencyLevel = (dateStr: string): 'overdue' | 'due-today' | 'upcoming' => {
    const now = new Date();
    const created = new Date(dateStr);
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays >= 3) return 'overdue';
    if (diffDays >= 1) return 'due-today';
    return 'upcoming';
  };

  const getUrgencyLabel = (level: string) => {
    switch (level) {
      case 'overdue': return 'NEEDS ATTENTION';
      case 'due-today': return 'PENDING';
      default: return 'NEW';
    }
  };

  const handleApprove = async (request: PropertyTypeRequest) => {
    setIsSubmitting(true);
    await approveRequest(request.propertyTypeRequestId);
    setIsSubmitting(false);
  };

  const handleReject = async () => {
    if (!reviewingRequest || !rejectionReason.trim()) return;
    setIsSubmitting(true);
    await rejectRequest(reviewingRequest.propertyTypeRequestId, rejectionReason.trim());
    setIsSubmitting(false);
    setReviewingRequest(null);
    setRejectionReason('');
  };

  const getClientName = (r: PropertyTypeRequest) => {
    const p = r.strataProfile?.profile;
    return p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.displayName || 'Unknown' : 'Unknown';
  };

  const getStrataName = (r: PropertyTypeRequest) => {
    return r.strataProfile?.strata?.complexName || r.strataProfile?.strata?.strataPlan || 'Unknown Strata';
  };

  const statsLoading = requestsLoading || stratasLoading || usersLoading || appointmentsLoading;

  if (statsLoading) return <LoadingSpinner />;

  return (
    <div className="admin-dashboard">
      <div className="dashboard-welcome">
        <h1>Welcome, {adminName}</h1>
        <p className="dashboard-subtitle">Dashboard</p>
      </div>

      <div className="dashboard-overview">
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-number">{users.length}</span>
            <span className="stat-label">Active Users</span>
          </div>
          <div className="stat-card stat-card--warning">
            <span className="stat-number">{requests.length}</span>
            <span className="stat-label">Pending Approvals</span>
          </div>
          <div className="stat-card stat-card--accent">
            <span className="stat-number">{appointmentsThisWeek.length}</span>
            <span className="stat-label">Appointments This Week</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stratas.length}</span>
            <span className="stat-label">Total Active Strata</span>
          </div>

          <div className="quick-actions-card">
            <h3>Quick Actions</h3>
            <button className="quick-action-link" onClick={() => navigate('/admin/strata')}>
              + Create New Strata
            </button>
            <button className="quick-action-link" onClick={() => navigate('/admin/users')}>
              + Create New User
            </button>
          </div>
        </div>
      </div>

      <section className="dashboard-section">
        <h2>Urgent Actions</h2>

        {requests.length === 0 ? (
          <div className="empty-actions">
            <p>No pending actions at this time.</p>
          </div>
        ) : (
          <div className="action-cards">
            {requests.map((r) => {
              const urgency = getUrgencyLevel(r.createdAt);
              return (
                <div key={r.propertyTypeRequestId} className={`action-card action-card--${urgency}`}>
                  <div className="action-card-header">
                    <span className={`urgency-badge urgency-badge--${urgency}`}>
                      {getUrgencyLabel(urgency)}
                    </span>
                  </div>
                  <h4 className="action-card-title">{getStrataName(r)}</h4>
                  <p className="action-card-desc">
                    {getClientName(r)} has requested access to: {getPropertyTypeNames(r.requestedPropertyTypeIds)}.
                    Submitted {getTimeSince(r.createdAt)}.
                  </p>
                  <div className="action-card-actions">
                    <button
                      className="btn-action btn-action--primary"
                      onClick={() => handleApprove(r)}
                      disabled={isSubmitting}
                    >
                      Approve
                    </button>
                    <button
                      className="btn-action btn-action--secondary"
                      onClick={() => { setReviewingRequest(r); setRejectionReason(''); }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <h2>Appointments</h2>

        {appointmentRequests.length > 0 && (
          <div className="dashboard-alert dashboard-alert--warning" onClick={() => navigate('/admin/appointments')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/appointments')}>
            <span className="dashboard-alert__count">{appointmentRequests.length}</span>
            <span className="dashboard-alert__text">
              pending appointment {appointmentRequests.length === 1 ? 'request' : 'requests'} awaiting review
            </span>
            <span className="dashboard-alert__action">Review &rarr;</span>
          </div>
        )}

        {upcomingAppointments.length === 0 ? (
          <div className="empty-actions">
            <p>No upcoming appointments.</p>
          </div>
        ) : (
          <div className="dashboard-appointments">
            <h3 className="dashboard-appointments__subtitle">Upcoming Appointments</h3>
            <div className="action-cards">
              {upcomingAppointments.map((apt) => {
                const aptDate = new Date(apt.appointmentDate);
                const dateStr = aptDate.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
                const strataName = apt.serviceRequest?.strata?.complexName || apt.serviceRequest?.strata?.strataPlan || 'Unknown';
                const inspectorName = apt.inspector ? (apt.inspector.displayName || `${apt.inspector.firstName} ${apt.inspector.lastName}`) : 'Unassigned';

                return (
                  <div key={apt.appointmentId} className="action-card action-card--upcoming">
                    <div className="action-card-header">
                      <span className="urgency-badge urgency-badge--upcoming">{apt.status}</span>
                    </div>
                    <h4 className="action-card-title">{strataName}</h4>
                    <p className="action-card-desc">
                      {dateStr} &middot; {apt.timeSlot.slotName} ({apt.timeSlot.slotTime.slice(0, 5)}) &middot; {apt.appointmentType.typeName}
                    </p>
                    <p className="action-card-desc">Inspector: {inspectorName}</p>
                    <div className="action-card-actions">
                      <button
                        className="btn-action btn-action--secondary"
                        onClick={() => navigate('/admin/appointments')}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <Modal
        isOpen={!!reviewingRequest}
        onClose={() => setReviewingRequest(null)}
        title="Reject Property Type Request"
        size="medium"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setReviewingRequest(null)}>Cancel</button>
            <button className="btn-delete" onClick={handleReject} disabled={!rejectionReason.trim() || isSubmitting}>
              {isSubmitting ? 'Rejecting...' : 'Reject Request'}
            </button>
          </>
        }
      >
        <div className="rejection-form">
          <p>Please provide a reason for rejecting this request:</p>
          <textarea
            className="form-textarea"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter rejection reason..."
            rows={3}
          />
        </div>
      </Modal>
    </div>
  );
};

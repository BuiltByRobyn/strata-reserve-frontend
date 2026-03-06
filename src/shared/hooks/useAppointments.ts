import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from './useApiClient';
import type { AppointmentWithDetails, AppointmentRequest } from '../types/entities.types';
import type { AppointmentsState } from '../types/hooks.types';

export const useAppointments = () => {
  const api = useApiClient();
  const [state, setState] = useState<AppointmentsState>({
    appointments: [],
    loading: true,
    error: null
  });
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  const fetchAppointments = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const appointments = await api.get<AppointmentWithDetails[]>('/admin/appointments');
      setState({ appointments: appointments || [], loading: false, error: null });
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load appointments'
      }));
    }
  }, [api]);

  const getAppointmentById = useCallback(async (id: number): Promise<AppointmentWithDetails | null> => {
    try {
      return await api.get<AppointmentWithDetails>(`/admin/appointments/${id}`);
    } catch (error) {
      console.error('Error fetching appointment:', error);
      return null;
    }
  }, [api]);

  const updateStatus = useCallback(async (id: number, status: string, completionNote?: string): Promise<boolean> => {
    try {
      await api.put(`/admin/appointments/${id}/status`, { status, completionNote });
      await fetchAppointments();
      return true;
    } catch (error) {
      console.error('Error updating appointment status:', error);
      throw error;
    }
  }, [api, fetchAppointments]);

  const cancelAppointment = useCallback(async (id: number, reason?: string): Promise<boolean> => {
    try {
      await api.del(`/admin/appointments/${id}`, { reason });
      await fetchAppointments();
      return true;
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      throw error;
    }
  }, [api, fetchAppointments]);

  const rescheduleAppointment = useCallback(async (
    id: number,
    appointmentDate: string,
    timeSlotId: number,
    options?: { inspectorProfileId?: string; secondInspectorProfileId?: string; reason?: string }
  ): Promise<boolean> => {
    try {
      await api.put(`/admin/appointments/${id}/reschedule`, {
        appointmentDate,
        timeSlotId,
        ...options,
      });
      await fetchAppointments();
      return true;
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      throw error;
    }
  }, [api, fetchAppointments]);

  const fetchAppointmentRequests = useCallback(async (status?: string) => {
    setRequestsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      const data = await api.get<AppointmentRequest[]>('/admin/appointments/requests', { params });
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setRequestsLoading(false);
    }
  }, [api]);

  const reviewAppointmentRequest = useCallback(async (
    id: number,
    data: {
      approved: boolean;
      approvedDateChoice?: number;
      rejectionReason?: string;
      inspectorProfileId?: string;
      comments?: string;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await api.post(`/admin/appointments/requests/${id}/review`, data);
      await fetchAppointmentRequests('Pending Review');
      await fetchAppointments();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Review failed' };
    }
  }, [api, fetchAppointmentRequests, fetchAppointments]);

  const checkInspectorAvailability = useCallback(async (
    inspectorProfileId: string,
    date: string
  ): Promise<boolean> => {
    try {
      const data = await api.get<any[]>('/admin/inspector-availability/range', {
        params: { startDate: date, endDate: date, inspectorProfileId },
      });
      return Array.isArray(data) && data.length > 0;
    } catch {
      return false;
    }
  }, [api]);

  const createInspectorAvailability = useCallback(async (
    inspectorProfileId: string,
    date: string
  ): Promise<void> => {
    await api.post('/admin/inspector-availability', {
      availableStartDate: date,
      availableEndDate: date,
      inspectorProfileId,
      locationCodes: [],
    });
  }, [api]);

  const createAppointment = useCallback(async (data: {
    fileNumberId: number;
    appointmentDate: string;
    timeSlotId: number;
    appointmentTypeId: number;
    inspectorProfileId?: string;
    secondInspectorProfileId?: string;
  }): Promise<boolean> => {
    try {
      await api.post('/admin/appointments', data);
      await fetchAppointments();
      return true;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  }, [api, fetchAppointments]);

  const fetchTimeSlots = useCallback(async () => {
    try {
      return await api.get<any[]>('/admin/appointments/time-slots');
    } catch {
      return [];
    }
  }, [api]);

  const fetchAppointmentTypes = useCallback(async () => {
    try {
      return await api.get<any[]>('/admin/appointments/types');
    } catch {
      return [];
    }
  }, [api]);

  const requestRebooking = useCallback(async (appointmentId: number): Promise<boolean> => {
    try {
      await api.post(`/admin/appointments/${appointmentId}/request-rebooking`, {});
      await fetchAppointments();
      return true;
    } catch (error) {
      console.error('Error requesting rebooking:', error);
      throw error;
    }
  }, [api, fetchAppointments]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return {
    ...state,
    requests,
    requestsLoading,
    refetch: fetchAppointments,
    getAppointmentById,
    updateStatus,
    cancelAppointment,
    rescheduleAppointment,
    createAppointment,
    fetchTimeSlots,
    fetchAppointmentTypes,
    requestRebooking,
    fetchAppointmentRequests,
    reviewAppointmentRequest,
    checkInspectorAvailability,
    createInspectorAvailability,
  };
};

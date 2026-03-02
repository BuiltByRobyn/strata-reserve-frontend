import { useState, useCallback } from 'react';
import { useApiClient } from './useApiClient';
import type { AvailableDay, ActiveAppointmentResponse } from '../types/appointment.types';

export const useClientAppointments = () => {
  const api = useApiClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAvailability = useCallback(async (
    startDate: string,
    endDate: string,
    serviceRequestId: number,
    isDraftMeeting = false
  ): Promise<AvailableDay[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<AvailableDay[]>('/client/appointments/availability', {
        params: { startDate, endDate, serviceRequestId, isDraftMeeting }
      });
      return data || [];
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load availability';
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, [api]);

  const createRequest = useCallback(async (data: {
    serviceRequestId: number;
    appointmentTypeId: number;
    firstChoiceDate: string;
    firstChoiceTimeSlotId: number;
    secondChoiceDate?: string;
    secondChoiceTimeSlotId?: number;
    specialRequirements?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      await api.post('/client/appointments/request', data);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to submit request' };
    }
  }, [api]);

  const getActiveAppointment = useCallback(async (): Promise<ActiveAppointmentResponse> => {
    try {
      return await api.get<ActiveAppointmentResponse>('/client/appointments/active');
    } catch {
      return null;
    }
  }, [api]);

  const cancelRequest = useCallback(async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
      await api.put(`/client/appointments/request/${id}/cancel`, {});
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to cancel request' };
    }
  }, [api]);

  const cancelAppointment = useCallback(async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
      await api.put(`/client/appointments/${id}/cancel`, {});
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to cancel appointment' };
    }
  }, [api]);

  const rescheduleAppointment = useCallback(async (
    id: number,
    newDate: string,
    newTimeSlotId: number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await api.put(`/client/appointments/${id}/reschedule`, { newDate, newTimeSlotId });
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to reschedule' };
    }
  }, [api]);

  const checkDraftMeetingEligibility = useCallback(async (serviceRequestId: number): Promise<boolean> => {
    try {
      const result = await api.get<{ eligible: boolean }>('/client/appointments/draft-meeting-eligibility', {
        params: { serviceRequestId }
      });
      return result?.eligible ?? false;
    } catch {
      return false;
    }
  }, [api]);

  return {
    loading,
    error,
    getAvailability,
    createRequest,
    getActiveAppointment,
    cancelRequest,
    cancelAppointment,
    rescheduleAppointment,
    checkDraftMeetingEligibility,
  };
};

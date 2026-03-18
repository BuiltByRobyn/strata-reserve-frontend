import { useCallback } from 'react';
import { useApiClient } from './useApiClient';
import type { AvailableDay, ActiveAppointmentResponse, AppointmentNotification } from '../types/appointment.types';

export const useClientAppointments = () => {
  const api = useApiClient();

  const getAvailability = useCallback(async (
    startDate: string,
    endDate: string,
    fileNumberId: number,
    isDraftMeeting = false
  ): Promise<AvailableDay[]> => {
    try {
      const data = await api.get<AvailableDay[]>('/client/appointments/availability', {
        params: { startDate, endDate, fileNumberId, isDraftMeeting }
      });
      return data || [];
    } catch {
      return [];
    }
  }, [api]);

  const createRequest = useCallback(async (data: {
    fileNumberId: number;
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

  const checkDraftMeetingEligibility = useCallback(async (fileNumberId: number): Promise<boolean> => {
    try {
      const result = await api.get<{ eligible: boolean }>('/client/appointments/draft-meeting-eligibility', {
        params: { fileNumberId }
      });
      return result?.eligible ?? false;
    } catch {
      return false;
    }
  }, [api]);

  const getNotifications = useCallback(async (): Promise<AppointmentNotification[]> => {
    try {
      return await api.get<AppointmentNotification[]>('/client/appointments/notifications') ?? [];
    } catch {
      return [];
    }
  }, [api]);

  return {
    getAvailability,
    createRequest,
    getActiveAppointment,
    cancelRequest,
    cancelAppointment,
    rescheduleAppointment,
    checkDraftMeetingEligibility,
    getNotifications,
  };
};

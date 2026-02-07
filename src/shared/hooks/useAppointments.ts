// Appointments Hook - CRUD operations for appointment management
import { useState, useEffect, useCallback } from 'react';
import { useAuthFetch } from './useAuthFetch';
import type { 
  AppointmentWithDetails,
  ApiListResponse,
  ApiSingleResponse 
} from '../types/entities.types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface AppointmentsState {
  appointments: AppointmentWithDetails[];
  loading: boolean;
  error: string | null;
}

export const useAppointments = () => {
  const authFetch = useAuthFetch();
  const [state, setState] = useState<AppointmentsState>({
    appointments: [],
    loading: true,
    error: null
  });

  // Fetch all appointments
  const fetchAppointments = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const url = `${API_BASE}/admin/appointments`;
      const response = await authFetch(url);
      const data: ApiListResponse<AppointmentWithDetails> = await response.json();
      
      if (data.success) {
        setState({ appointments: data.data || [], loading: false, error: null });
      } else {
        throw new Error(data.error || 'Failed to fetch appointments');
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load appointments'
      }));
    }
  }, [authFetch]);

  // Get appointment by ID
  const getAppointmentById = useCallback(async (id: number): Promise<AppointmentWithDetails | null> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/appointments/${id}`);
      const data: ApiSingleResponse<AppointmentWithDetails> = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching appointment:', error);
      return null;
    }
  }, [authFetch]);

  // Update appointment status
  const updateStatus = useCallback(async (id: number, status: string, completionNote?: string): Promise<boolean> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/appointments/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, completionNote })
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchAppointments();
        return true;
      }
      throw new Error(data.error || 'Failed to update status');
    } catch (error) {
      console.error('Error updating appointment status:', error);
      throw error;
    }
  }, [authFetch, fetchAppointments]);

  // Cancel appointment
  const cancelAppointment = useCallback(async (id: number): Promise<boolean> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/appointments/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchAppointments();
        return true;
      }
      throw new Error(data.error || 'Failed to cancel appointment');
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      throw error;
    }
  }, [authFetch, fetchAppointments]);

  // Reschedule appointment
  const rescheduleAppointment = useCallback(async (
    id: number, 
    appointmentDate: string, 
    timeSlotId: number
  ): Promise<boolean> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/appointments/${id}/reschedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentDate, timeSlotId })
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchAppointments();
        return true;
      }
      throw new Error(data.error || 'Failed to reschedule appointment');
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      throw error;
    }
  }, [authFetch, fetchAppointments]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return {
    ...state,
    refetch: fetchAppointments,
    getAppointmentById,
    updateStatus,
    cancelAppointment,
    rescheduleAppointment
  };
};

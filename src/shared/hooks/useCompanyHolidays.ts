import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from './useApiClient';
import { REQUEST_TIMEOUT_MS } from '../lib/apiClient';
import type {
  CompanyHoliday,
  CreateCompanyHolidayInput,
  UpdateCompanyHolidayInput,
} from '../types/entities.types';
import type { CompanyHolidaysState } from '../types/hooks.types';

export const useCompanyHolidays = () => {
  const api = useApiClient();
  const [state, setState] = useState<CompanyHolidaysState>({
    holidays: [],
    loading: true,
    error: null
  });

  const fetchHolidays = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const holidays = await api.get<CompanyHoliday[]>('/admin/company-holidays', {
        timeout: REQUEST_TIMEOUT_MS,
      });
      setState({ holidays: holidays || [], loading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof Error
        ? (error.name === 'AbortError'
          ? 'Request timed out. Is the backend running?'
          : error.message)
        : 'Failed to load company holidays';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
    }
  }, [api]);

  const getHolidayById = useCallback(async (id: number): Promise<CompanyHoliday | null> => {
    try {
      return await api.get<CompanyHoliday>(`/admin/company-holidays/${id}`);
    } catch {
      return null;
    }
  }, [api]);

  const createHoliday = useCallback(async (input: CreateCompanyHolidayInput): Promise<CompanyHoliday | null> => {
    try {
      const result = await api.post<CompanyHoliday>('/admin/company-holidays', input);
      await fetchHolidays();
      return result;
    } catch (error) {
      throw error;
    }
  }, [api, fetchHolidays]);

  const updateHoliday = useCallback(async (id: number, input: UpdateCompanyHolidayInput): Promise<CompanyHoliday | null> => {
    try {
      const result = await api.put<CompanyHoliday>(`/admin/company-holidays/${id}`, input);
      await fetchHolidays();
      return result;
    } catch (error) {
      throw error;
    }
  }, [api, fetchHolidays]);

  const deleteHoliday = useCallback(async (id: number): Promise<boolean> => {
    try {
      await api.del(`/admin/company-holidays/${id}`);
      await fetchHolidays();
      return true;
    } catch (error) {
      throw error;
    }
  }, [api, fetchHolidays]);

  const getHolidaysByYear = useCallback(async (year: number): Promise<CompanyHoliday[]> => {
    try {
      return await api.get<CompanyHoliday[]>('/admin/company-holidays/by-year', {
        params: { year },
      });
    } catch {
      return [];
    }
  }, [api]);

  const checkIsHoliday = useCallback(async (date: string): Promise<boolean> => {
    try {
      const result = await api.get<{ isHoliday: boolean }>('/admin/company-holidays/check', {
        params: { date },
      });
      return result?.isHoliday ?? false;
    } catch {
      return false;
    }
  }, [api]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  return {
    ...state,
    refetch: fetchHolidays,
    getHolidayById,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    getHolidaysByYear,
    checkIsHoliday
  };
};

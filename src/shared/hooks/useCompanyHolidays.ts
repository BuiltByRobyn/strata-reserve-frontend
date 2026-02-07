// Company Holidays Hook - CRUD operations for company holidays
import { useState, useEffect, useCallback } from 'react';
import { useAuthFetch } from './useAuthFetch';
import type { 
  CompanyHoliday, 
  CreateCompanyHolidayInput, 
  UpdateCompanyHolidayInput,
  ApiListResponse,
  ApiSingleResponse 
} from '../types/entities.types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface CompanyHolidaysState {
  holidays: CompanyHoliday[];
  loading: boolean;
  error: string | null;
}

export const useCompanyHolidays = () => {
  const authFetch = useAuthFetch();
  const [state, setState] = useState<CompanyHolidaysState>({
    holidays: [],
    loading: true,
    error: null
  });

  // Fetch all company holidays
  const fetchHolidays = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await authFetch(`${API_BASE}/admin/company-holidays`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data: ApiListResponse<CompanyHoliday> = await response.json();
      
      if (data.success) {
        setState({ holidays: data.data || [], loading: false, error: null });
      } else {
        throw new Error(data.error || 'Failed to fetch company holidays');
      }
    } catch (error) {
      console.error('Error fetching company holidays:', error);
      const errorMessage = error instanceof Error 
        ? (error.name === 'AbortError' 
          ? 'Request timed out. Is the backend running?' 
          : error.message)
        : 'Failed to load company holidays';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  }, [authFetch]);

  // Get holiday by ID
  const getHolidayById = useCallback(async (id: number): Promise<CompanyHoliday | null> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/company-holidays/${id}`);
      const data: ApiSingleResponse<CompanyHoliday> = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching company holiday:', error);
      return null;
    }
  }, [authFetch]);

  // Create holiday
  const createHoliday = useCallback(async (input: CreateCompanyHolidayInput): Promise<CompanyHoliday | null> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/company-holidays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      const data: ApiSingleResponse<CompanyHoliday> = await response.json();
      
      if (data.success && data.data) {
        await fetchHolidays();
        return data.data;
      }
      throw new Error(data.error || 'Failed to create company holiday');
    } catch (error) {
      console.error('Error creating company holiday:', error);
      throw error;
    }
  }, [authFetch, fetchHolidays]);

  // Update holiday
  const updateHoliday = useCallback(async (id: number, input: UpdateCompanyHolidayInput): Promise<CompanyHoliday | null> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/company-holidays/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      const data: ApiSingleResponse<CompanyHoliday> = await response.json();
      
      if (data.success && data.data) {
        await fetchHolidays();
        return data.data;
      }
      throw new Error(data.error || 'Failed to update company holiday');
    } catch (error) {
      console.error('Error updating company holiday:', error);
      throw error;
    }
  }, [authFetch, fetchHolidays]);

  // Delete holiday
  const deleteHoliday = useCallback(async (id: number): Promise<boolean> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/company-holidays/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchHolidays();
        return true;
      }
      throw new Error(data.error || 'Failed to delete company holiday');
    } catch (error) {
      console.error('Error deleting company holiday:', error);
      throw error;
    }
  }, [authFetch, fetchHolidays]);

  // Get holidays by year
  const getHolidaysByYear = useCallback(async (year: number): Promise<CompanyHoliday[]> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/company-holidays/by-year?year=${year}`);
      const data: ApiListResponse<CompanyHoliday> = await response.json();
      
      if (data.success) {
        return data.data || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching holidays by year:', error);
      return [];
    }
  }, [authFetch]);

  // Check if a date is a holiday
  const checkIsHoliday = useCallback(async (date: string): Promise<boolean> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/company-holidays/check?date=${date}`);
      const data = await response.json();
      
      if (data.success) {
        return data.data?.isHoliday ?? false;
      }
      return false;
    } catch (error) {
      console.error('Error checking if date is holiday:', error);
      return false;
    }
  }, [authFetch]);

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

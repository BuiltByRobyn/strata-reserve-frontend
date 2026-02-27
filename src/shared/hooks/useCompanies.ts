import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from './useApiClient';
import { REQUEST_TIMEOUT_MS } from '../lib/apiClient';
import type {
  Company,
  CompanyWithStratas,
  CreateCompanyInput,
  UpdateCompanyInput,
} from '../types/entities.types';
import type { CompaniesState } from '../types/hooks.types';

export const useCompanies = () => {
  const api = useApiClient();
  const [state, setState] = useState<CompaniesState>({
    companies: [],
    loading: true,
    error: null
  });

  const fetchCompanies = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const companies = await api.get<Company[]>('/admin/companies', {
        timeout: REQUEST_TIMEOUT_MS,
      });
      setState({ companies: companies || [], loading: false, error: null });
    } catch (error) {
      console.error('Error fetching companies:', error);
      const errorMessage = error instanceof Error
        ? (error.name === 'AbortError'
          ? 'Request timed out. Is the backend running?'
          : error.message)
        : 'Failed to load companies';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
    }
  }, [api]);

  const getCompanyById = useCallback(
    async (id: number): Promise<CompanyWithStratas | null> => {
      try {
        return await api.get<CompanyWithStratas>(`/admin/companies/${id}`);
      } catch (error) {
        console.error('Error fetching company:', error);
        return null;
      }
    },
    [api]
  );

  const createCompany = useCallback(async (input: CreateCompanyInput): Promise<Company | null> => {
    try {
      const result = await api.post<Company>('/admin/companies', input);
      await fetchCompanies();
      return result;
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  }, [api, fetchCompanies]);

  const updateCompany = useCallback(async (id: number, input: UpdateCompanyInput): Promise<Company | null> => {
    try {
      const result = await api.put<Company>(`/admin/companies/${id}`, input);
      await fetchCompanies();
      return result;
    } catch (error) {
      console.error('Error updating company:', error);
      throw error;
    }
  }, [api, fetchCompanies]);

  const deleteCompany = useCallback(async (id: number): Promise<boolean> => {
    try {
      await api.del(`/admin/companies/${id}`);
      await fetchCompanies();
      return true;
    } catch (error) {
      console.error('Error deleting company:', error);
      throw error;
    }
  }, [api, fetchCompanies]);

  const searchCompanies = useCallback(async (query: string): Promise<Company[]> => {
    try {
      return await api.get<Company[]>('/admin/companies/search', {
        params: { q: query },
      });
    } catch (error) {
      console.error('Error searching companies:', error);
      return [];
    }
  }, [api]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  return {
    ...state,
    refetch: fetchCompanies,
    getCompanyById,
    createCompany,
    updateCompany,
    deleteCompany,
    searchCompanies
  };
};

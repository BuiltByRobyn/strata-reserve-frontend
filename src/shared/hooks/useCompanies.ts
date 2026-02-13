import { useState, useEffect, useCallback } from 'react';
import { useAuthFetch } from './useAuthFetch';
import type {
  Company,
  CompanyWithStratas,
  CreateCompanyInput,
  UpdateCompanyInput,
  ApiListResponse,
  ApiSingleResponse
} from '../types/entities.types';
import type { CompaniesState } from '../types/hooks.types';
import { API_BASE } from '../lib/api';

export const useCompanies = () => {
  const authFetch = useAuthFetch();
  const [state, setState] = useState<CompaniesState>({
    companies: [],
    loading: true,
    error: null
  });

  // Fetch all companies
  const fetchCompanies = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await authFetch(`${API_BASE}/admin/companies`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data: ApiListResponse<Company> = await response.json();
      
      if (data.success) {
        setState({ companies: data.data || [], loading: false, error: null });
      } else {
        throw new Error(data.error || 'Failed to fetch companies');
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      const errorMessage = error instanceof Error 
        ? (error.name === 'AbortError' 
          ? 'Request timed out. Is the backend running?' 
          : error.message)
        : 'Failed to load companies';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  }, [authFetch]);

  // Get company by ID
  const getCompanyById = useCallback(async (id: number): Promise<CompanyWithStratas | null> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/companies/${id}`);
      const data: ApiSingleResponse<CompanyWithStratas> = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching company:', error);
      return null;
    }
  }, [authFetch]);

  // Create company
  const createCompany = useCallback(async (input: CreateCompanyInput): Promise<Company | null> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      const data: ApiSingleResponse<Company> = await response.json();
      
      if (data.success && data.data) {
        // Refresh list
        await fetchCompanies();
        return data.data;
      }
      throw new Error(data.error || 'Failed to create company');
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  }, [authFetch, fetchCompanies]);

  // Update company
  const updateCompany = useCallback(async (id: number, input: UpdateCompanyInput): Promise<Company | null> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/companies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      const data: ApiSingleResponse<Company> = await response.json();
      
      if (data.success && data.data) {
        // Refresh list
        await fetchCompanies();
        return data.data;
      }
      throw new Error(data.error || 'Failed to update company');
    } catch (error) {
      console.error('Error updating company:', error);
      throw error;
    }
  }, [authFetch, fetchCompanies]);

  // Delete company
  const deleteCompany = useCallback(async (id: number): Promise<boolean> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/companies/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        // Refresh list
        await fetchCompanies();
        return true;
      }
      throw new Error(data.error || 'Failed to delete company');
    } catch (error) {
      console.error('Error deleting company:', error);
      throw error;
    }
  }, [authFetch, fetchCompanies]);

  // Search companies
  const searchCompanies = useCallback(async (query: string): Promise<Company[]> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/companies/search?q=${encodeURIComponent(query)}`);
      const data: ApiListResponse<Company> = await response.json();
      
      if (data.success) {
        return data.data || [];
      }
      return [];
    } catch (error) {
      console.error('Error searching companies:', error);
      return [];
    }
  }, [authFetch]);

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

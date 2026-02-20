import { useState, useEffect, useCallback } from 'react';
import { useAuthFetch } from './useAuthFetch';
import type {
  Strata,
  StrataWithDetails,
  CreateStrataInput,
  UpdateStrataInput,
  CreateStrataNoteInput,
  CreateStrataEmployeeInput,
  CreateStrataServiceInput,
  StrataNoteBasic,
  StrataEmployee,
  StrataService,
  ApiListResponse,
  ApiSingleResponse
} from '../types/entities.types';
import type { StrataState } from '../types/hooks.types';
import { API_BASE } from '../lib/api';

export const useStrata = () => {
  const authFetch = useAuthFetch();
  const [state, setState] = useState<StrataState>({
    stratas: [],
    loading: true,
    error: null
  });

  // Fetch all stratas
  const fetchStratas = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await authFetch(`${API_BASE}/admin/strata`);
      const data: ApiListResponse<Strata> = await response.json();
      
      if (data.success) {
        setState({ stratas: data.data || [], loading: false, error: null });
      } else {
        throw new Error(data.error || 'Failed to fetch stratas');
      }
    } catch (error) {
      console.error('Error fetching stratas:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load stratas'
      }));
    }
  }, [authFetch]);

  // Get strata by ID with full details
  const getStrataById = useCallback(async (id: number): Promise<StrataWithDetails | null> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/strata/${id}`);
      const data: ApiSingleResponse<StrataWithDetails> = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching strata:', error);
      return null;
    }
  }, [authFetch]);

  // Create strata
  const createStrata = useCallback(async (input: CreateStrataInput): Promise<Strata | null> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/strata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      const data: ApiSingleResponse<Strata> = await response.json();
      
      if (data.success && data.data) {
        await fetchStratas();
        return data.data;
      }
      throw new Error(data.error || 'Failed to create strata');
    } catch (error) {
      console.error('Error creating strata:', error);
      throw error;
    }
  }, [authFetch, fetchStratas]);

  // Update strata
  const updateStrata = useCallback(async (id: number, input: UpdateStrataInput): Promise<Strata | null> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/strata/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      const data: ApiSingleResponse<Strata> = await response.json();
      
      if (data.success && data.data) {
        await fetchStratas();
        return data.data;
      }
      throw new Error(data.error || 'Failed to update strata');
    } catch (error) {
      console.error('Error updating strata:', error);
      throw error;
    }
  }, [authFetch, fetchStratas]);

  // Delete strata
  const deleteStrata = useCallback(async (id: number): Promise<boolean> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/strata/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchStratas();
        return true;
      }
      throw new Error(data.error || 'Failed to delete strata');
    } catch (error) {
      console.error('Error deleting strata:', error);
      throw error;
    }
  }, [authFetch, fetchStratas]);

  // Search stratas
  const searchStratas = useCallback(async (query: string): Promise<Strata[]> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/strata/search?q=${encodeURIComponent(query)}`);
      const data: ApiListResponse<Strata> = await response.json();
      
      if (data.success) {
        return data.data || [];
      }
      return [];
    } catch (error) {
      console.error('Error searching stratas:', error);
      return [];
    }
  }, [authFetch]);

  // ============================================
  // Strata Notes
  // ============================================
  const addNote = useCallback(async (strataId: number, input: CreateStrataNoteInput): Promise<StrataNoteBasic | null> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/strata/${strataId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      const data: ApiSingleResponse<StrataNoteBasic> = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }
      throw new Error(data.error || 'Failed to add note');
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  }, [authFetch]);

  const deleteNote = useCallback(async (strataId: number, noteId: number): Promise<boolean> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/strata/${strataId}/notes/${noteId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }, [authFetch]);

  // ============================================
  // Strata Employees
  // ============================================
  const assignEmployee = useCallback(async (strataId: number, input: CreateStrataEmployeeInput): Promise<StrataEmployee | null> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/strata/${strataId}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      const data: ApiSingleResponse<StrataEmployee> = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }
      throw new Error(data.error || 'Failed to assign employee');
    } catch (error) {
      console.error('Error assigning employee:', error);
      throw error;
    }
  }, [authFetch]);

  const updateEmployeePosition = useCallback(async (strataId: number, employeeId: number, position: string): Promise<boolean> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/strata/${strataId}/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strataPosition: position })
      });
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error updating employee position:', error);
      throw error;
    }
  }, [authFetch]);

  const removeEmployee = useCallback(async (strataId: number, employeeId: number): Promise<boolean> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/strata/${strataId}/employees/${employeeId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error removing employee:', error);
      throw error;
    }
  }, [authFetch]);

  // ============================================
  // Strata Services
  // ============================================
  const addService = useCallback(async (strataId: number, input: CreateStrataServiceInput): Promise<StrataService | null> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/strata/${strataId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      const data: ApiSingleResponse<StrataService> = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }
      throw new Error(data.error || 'Failed to add service');
    } catch (error) {
      console.error('Error adding service:', error);
      throw error;
    }
  }, [authFetch]);

  const removeService = useCallback(async (strataId: number, serviceId: number): Promise<boolean> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/strata/${strataId}/services/${serviceId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error removing service:', error);
      throw error;
    }
  }, [authFetch]);

  useEffect(() => {
    fetchStratas();
  }, [fetchStratas]);

  return {
    ...state,
    refetch: fetchStratas,
    getStrataById,
    createStrata,
    updateStrata,
    deleteStrata,
    searchStratas,
    // Notes
    addNote,
    deleteNote,
    // Employees
    assignEmployee,
    updateEmployeePosition,
    removeEmployee,
    // Services
    addService,
    removeService
  };
};

import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from './useApiClient';
import type {
  Strata,
  StrataWithDetails,
  CreateStrataInput,
  UpdateStrataInput,
  CreateStrataNoteInput,
  CreateStrataEmployeeInput,
  StrataNoteBasic,
  StrataEmployee,
} from '../types/entities.types';
import type { StrataState } from '../types/hooks.types';

export const useStrata = () => {
  const api = useApiClient();
  const [state, setState] = useState<StrataState>({
    stratas: [],
    loading: true,
    error: null
  });

  const fetchStratas = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const stratas = await api.get<Strata[]>('/admin/strata');
      setState({ stratas: stratas || [], loading: false, error: null });
    } catch (error) {
      console.error('Error fetching stratas:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load stratas'
      }));
    }
  }, [api]);

  const getStrataById = useCallback(async (id: number): Promise<StrataWithDetails | null> => {
    try {
      return await api.get<StrataWithDetails>(`/admin/strata/${id}`);
    } catch (error) {
      console.error('Error fetching strata:', error);
      return null;
    }
  }, [api]);

  const createStrata = useCallback(async (input: CreateStrataInput): Promise<Strata | null> => {
    try {
      const result = await api.post<Strata>('/admin/strata', input);
      await fetchStratas();
      return result;
    } catch (error) {
      console.error('Error creating strata:', error);
      throw error;
    }
  }, [api, fetchStratas]);

  const updateStrata = useCallback(async (id: number, input: UpdateStrataInput): Promise<Strata | null> => {
    try {
      const result = await api.put<Strata>(`/admin/strata/${id}`, input);
      await fetchStratas();
      return result;
    } catch (error) {
      console.error('Error updating strata:', error);
      throw error;
    }
  }, [api, fetchStratas]);

  const deleteStrata = useCallback(async (id: number): Promise<boolean> => {
    try {
      await api.del(`/admin/strata/${id}`);
      await fetchStratas();
      return true;
    } catch (error) {
      console.error('Error deleting strata:', error);
      throw error;
    }
  }, [api, fetchStratas]);

  const searchStratas = useCallback(async (query: string): Promise<Strata[]> => {
    try {
      return await api.get<Strata[]>('/admin/strata/search', {
        params: { q: query },
      });
    } catch (error) {
      console.error('Error searching stratas:', error);
      return [];
    }
  }, [api]);

  // ============================================
  // Strata Notes
  // ============================================
  const addNote = useCallback(async (strataId: number, input: CreateStrataNoteInput): Promise<StrataNoteBasic | null> => {
    try {
      return await api.post<StrataNoteBasic>(`/admin/strata/${strataId}/notes`, input);
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  }, [api]);

  const deleteNote = useCallback(async (strataId: number, noteId: number): Promise<boolean> => {
    try {
      await api.del(`/admin/strata/${strataId}/notes/${noteId}`);
      return true;
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }, [api]);

  // ============================================
  // Strata Employees
  // ============================================
  const assignEmployee = useCallback(async (strataId: number, input: CreateStrataEmployeeInput): Promise<StrataEmployee | null> => {
    try {
      return await api.post<StrataEmployee>(`/admin/strata/${strataId}/employees`, input);
    } catch (error) {
      console.error('Error assigning employee:', error);
      throw error;
    }
  }, [api]);

  const updateEmployeePosition = useCallback(async (strataId: number, employeeId: number, position: string): Promise<boolean> => {
    try {
      await api.put(`/admin/strata/${strataId}/employees/${employeeId}`, { strataPosition: position });
      return true;
    } catch (error) {
      console.error('Error updating employee position:', error);
      throw error;
    }
  }, [api]);

  const removeEmployee = useCallback(async (strataId: number, employeeId: number): Promise<boolean> => {
    try {
      await api.del(`/admin/strata/${strataId}/employees/${employeeId}`);
      return true;
    } catch (error) {
      console.error('Error removing employee:', error);
      throw error;
    }
  }, [api]);



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
  };
};

import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from './useApiClient';
import type {
  UserWithStratas,
  CreateUserInput,
} from '../types/entities.types';
import type { UsersState, FetchUsersParams } from '../types/hooks.types';

export const useUsers = () => {
  const api = useApiClient();
  const [state, setState] = useState<UsersState>({
    users: [],
    loading: true,
    error: null
  });

  const fetchUsers = useCallback(async (params?: FetchUsersParams) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const queryParams: Record<string, string | number | boolean | undefined> = {};
      if (params?.search) queryParams.search = params.search;
      if (params?.strataId) queryParams.strataId = params.strataId;
      if (params?.userTypeId) queryParams.userTypeId = params.userTypeId;

      const users = await api.get<UserWithStratas[]>('/admin/users', {
        params: queryParams,
      });
      setState({ users: users || [], loading: false, error: null });
    } catch (error) {
      console.error('Error fetching users:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load users'
      }));
    }
  }, [api]);

  const getUserById = useCallback(async (id: string): Promise<UserWithStratas | null> => {
    try {
      return await api.get<UserWithStratas>(`/admin/users/${id}`);
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }, [api]);

  const createUser = useCallback(async (input: CreateUserInput): Promise<UserWithStratas | null> => {
    try {
      const result = await api.post<UserWithStratas>('/admin/users', input);
      await fetchUsers();
      return result;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }, [api, fetchUsers]);

  const updateUser = useCallback(async (id: string, input: Partial<CreateUserInput>): Promise<UserWithStratas | null> => {
    try {
      const result = await api.put<UserWithStratas>(`/admin/users/${id}`, input);
      await fetchUsers();
      return result;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }, [api, fetchUsers]);

  const deleteUser = useCallback(async (id: string): Promise<boolean> => {
    try {
      await api.del(`/admin/users/${id}`);
      await fetchUsers();
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }, [api, fetchUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    ...state,
    refetch: fetchUsers,
    fetchUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
  };
};

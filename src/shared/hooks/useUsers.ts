import { useState, useEffect, useCallback } from 'react';
import { useAuthFetch } from './useAuthFetch';
import type {
  UserWithStratas,
  CreateUserInput,
  ApiListResponse,
  ApiSingleResponse
} from '../types/entities.types';
import type { UsersState, FetchUsersParams } from '../types/hooks.types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const useUsers = () => {
  const authFetch = useAuthFetch();
  const [state, setState] = useState<UsersState>({
    users: [],
    loading: true,
    error: null
  });

  // Fetch all users with optional filters
  const fetchUsers = useCallback(async (params?: FetchUsersParams) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.set('search', params.search);
      if (params?.strataId) queryParams.set('strataId', params.strataId.toString());
      if (params?.userTypeId) queryParams.set('userTypeId', params.userTypeId.toString());

      const queryString = queryParams.toString();
      const url = `${API_BASE}/admin/users${queryString ? `?${queryString}` : ''}`;
      
      const response = await authFetch(url);
      const data: ApiListResponse<UserWithStratas> = await response.json();
      
      if (data.success) {
        setState({ users: data.data || [], loading: false, error: null });
      } else {
        throw new Error(data.error || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load users'
      }));
    }
  }, [authFetch]);

  // Get user by ID
  const getUserById = useCallback(async (id: string): Promise<UserWithStratas | null> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/users/${id}`);
      const data: ApiSingleResponse<UserWithStratas> = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }, [authFetch]);

  // Create user
  const createUser = useCallback(async (input: CreateUserInput): Promise<UserWithStratas | null> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      const data: ApiSingleResponse<UserWithStratas> = await response.json();
      
      if (data.success && data.data) {
        await fetchUsers();
        return data.data;
      }
      throw new Error(data.error || 'Failed to create user');
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }, [authFetch, fetchUsers]);

  // Update user
  const updateUser = useCallback(async (id: string, input: Partial<CreateUserInput>): Promise<UserWithStratas | null> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      const data: ApiSingleResponse<UserWithStratas> = await response.json();
      
      if (data.success && data.data) {
        await fetchUsers();
        return data.data;
      }
      throw new Error(data.error || 'Failed to update user');
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }, [authFetch, fetchUsers]);

  // Delete user
  const deleteUser = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await authFetch(`${API_BASE}/admin/users/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchUsers();
        return true;
      }
      throw new Error(data.error || 'Failed to delete user');
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }, [authFetch, fetchUsers]);

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

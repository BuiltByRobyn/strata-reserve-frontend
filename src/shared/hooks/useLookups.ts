// Lookups Hook - Fetch lookup/reference data
import { useState, useEffect, useCallback } from 'react';
import { useAuthFetch } from './useAuthFetch';
import type { 
  UserType, 
  LegalType, 
  PropertyType, 
  Service,
  ApiListResponse 
} from '../types/entities.types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface LookupState {
  userTypes: UserType[];
  legalTypes: LegalType[];
  propertyTypes: PropertyType[];
  services: Service[];
  loading: boolean;
  error: string | null;
}

export const useLookups = () => {
  const authFetch = useAuthFetch();
  const [state, setState] = useState<LookupState>({
    userTypes: [],
    legalTypes: [],
    propertyTypes: [],
    services: [],
    loading: true,
    error: null
  });

  const fetchAllLookups = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const [userTypesRes, legalTypesRes, propertyTypesRes, servicesRes] = await Promise.all([
        authFetch(`${API_BASE}/api/lookups/user-types`),
        authFetch(`${API_BASE}/api/lookups/legal-types`),
        authFetch(`${API_BASE}/api/lookups/property-types`),
        authFetch(`${API_BASE}/api/lookups/services`)
      ]);

      const [userTypesData, legalTypesData, propertyTypesData, servicesData]: [
        ApiListResponse<UserType>,
        ApiListResponse<LegalType>,
        ApiListResponse<PropertyType>,
        ApiListResponse<Service>
      ] = await Promise.all([
        userTypesRes.json(),
        legalTypesRes.json(),
        propertyTypesRes.json(),
        servicesRes.json()
      ]);

      setState({
        userTypes: userTypesData.data || [],
        legalTypes: legalTypesData.data || [],
        propertyTypes: propertyTypesData.data || [],
        services: servicesData.data || [],
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching lookups:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load lookup data'
      }));
    }
  }, [authFetch]);

  useEffect(() => {
    fetchAllLookups();
  }, [fetchAllLookups]);

  return {
    ...state,
    refetch: fetchAllLookups
  };
};

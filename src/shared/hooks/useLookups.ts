import { useState, useEffect, useCallback } from 'react';
import { useAuthFetch } from './useAuthFetch';
import type {
  UserType,
  LegalType,
  PropertyType,
  Service,
  ApiListResponse
} from '../types/entities.types';
import type { DocumentType, ReviewStatus } from '../types/document.types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface LookupState {
  userTypes: UserType[];
  legalTypes: LegalType[];
  propertyTypes: PropertyType[];
  services: Service[];
  documentTypes: DocumentType[];
  reviewStatuses: ReviewStatus[];
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
    documentTypes: [],
    reviewStatuses: [],
    loading: true,
    error: null
  });

  const fetchAllLookups = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [userTypesRes, legalTypesRes, propertyTypesRes, servicesRes, documentTypesRes, reviewStatusesRes] = await Promise.all([
        authFetch(`${API_BASE}/api/lookups/user-types`),
        authFetch(`${API_BASE}/api/lookups/legal-types`),
        authFetch(`${API_BASE}/api/lookups/property-types`),
        authFetch(`${API_BASE}/api/lookups/services`),
        authFetch(`${API_BASE}/api/lookups/document-types`),
        authFetch(`${API_BASE}/api/lookups/review-statuses`)
      ]);

      const [userTypesData, legalTypesData, propertyTypesData, servicesData, documentTypesData, reviewStatusesData]: [
        ApiListResponse<UserType>,
        ApiListResponse<LegalType>,
        ApiListResponse<PropertyType>,
        ApiListResponse<Service>,
        ApiListResponse<DocumentType>,
        ApiListResponse<ReviewStatus>
      ] = await Promise.all([
        userTypesRes.json(),
        legalTypesRes.json(),
        propertyTypesRes.json(),
        servicesRes.json(),
        documentTypesRes.json(),
        reviewStatusesRes.json()
      ]);

      setState({
        userTypes: userTypesData.data || [],
        legalTypes: legalTypesData.data || [],
        propertyTypes: propertyTypesData.data || [],
        services: servicesData.data || [],
        documentTypes: documentTypesData.data || [],
        reviewStatuses: reviewStatusesData.data || [],
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

import { useState, useEffect, useCallback } from 'react';
import { useAuthFetch } from './useAuthFetch';
import type {
  UserType,
  LegalType,
  PropertyType,
  Service,
  Section,
  QuestionType,
  ApiListResponse
} from '../types/entities.types';
import type { DocumentType, ReviewStatus } from '../types/document.types';
import type { LookupState } from '../types/hooks.types';
import { API_BASE } from '../lib/api';

export const useLookups = () => {
  const authFetch = useAuthFetch();
  const [state, setState] = useState<LookupState>({
    userTypes: [],
    legalTypes: [],
    propertyTypes: [],
    services: [],
    documentTypes: [],
    reviewStatuses: [],
    sections: [],
    questionTypes: [],
    loading: true,
    error: null
  });

  const fetchAllLookups = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [userTypesRes, legalTypesRes, propertyTypesRes, servicesRes, documentTypesRes, reviewStatusesRes, sectionsRes, questionTypesRes] = await Promise.all([
        authFetch(`${API_BASE}/api/lookups/user-types`),
        authFetch(`${API_BASE}/api/lookups/legal-types`),
        authFetch(`${API_BASE}/api/lookups/property-types`),
        authFetch(`${API_BASE}/api/lookups/services`),
        authFetch(`${API_BASE}/api/lookups/document-types`),
        authFetch(`${API_BASE}/api/lookups/review-statuses`),
        authFetch(`${API_BASE}/api/lookups/sections`),
        authFetch(`${API_BASE}/api/lookups/question-types`)
      ]);

      const [userTypesData, legalTypesData, propertyTypesData, servicesData, documentTypesData, reviewStatusesData, sectionsData, questionTypesData]: [
        ApiListResponse<UserType>,
        ApiListResponse<LegalType>,
        ApiListResponse<PropertyType>,
        ApiListResponse<Service>,
        ApiListResponse<DocumentType>,
        ApiListResponse<ReviewStatus>,
        ApiListResponse<Section>,
        ApiListResponse<QuestionType>
      ] = await Promise.all([
        userTypesRes.json(),
        legalTypesRes.json(),
        propertyTypesRes.json(),
        servicesRes.json(),
        documentTypesRes.json(),
        reviewStatusesRes.json(),
        sectionsRes.json(),
        questionTypesRes.json()
      ]);

      setState({
        userTypes: userTypesData.data || [],
        legalTypes: legalTypesData.data || [],
        propertyTypes: propertyTypesData.data || [],
        services: servicesData.data || [],
        documentTypes: documentTypesData.data || [],
        reviewStatuses: reviewStatusesData.data || [],
        sections: sectionsData.data || [],
        questionTypes: questionTypesData.data || [],
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

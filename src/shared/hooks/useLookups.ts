import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from './useApiClient';
import type {
  UserType,
  LegalType,
  PropertyType,
  Service,
  Section,
  QuestionType,
} from '../types/entities.types';
import type { DocumentType, ReviewStatus } from '../types/document.types';
import type { LookupState } from '../types/hooks.types';

export const useLookups = () => {
  const api = useApiClient();
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
      const [
        userTypes,
        legalTypes,
        propertyTypes,
        services,
        documentTypes,
        reviewStatuses,
        sections,
        questionTypes,
      ] = await Promise.all([
        api.get<UserType[]>('/api/lookups/user-types'),
        api.get<LegalType[]>('/api/lookups/legal-types'),
        api.get<PropertyType[]>('/api/lookups/property-types'),
        api.get<Service[]>('/api/lookups/services'),
        api.get<DocumentType[]>('/api/lookups/document-types'),
        api.get<ReviewStatus[]>('/api/lookups/review-statuses'),
        api.get<Section[]>('/api/lookups/sections'),
        api.get<QuestionType[]>('/api/lookups/question-types'),
      ]);

      setState({
        userTypes: userTypes || [],
        legalTypes: legalTypes || [],
        propertyTypes: propertyTypes || [],
        services: services || [],
        documentTypes: documentTypes || [],
        reviewStatuses: reviewStatuses || [],
        sections: sections || [],
        questionTypes: questionTypes || [],
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
  }, [api]);

  useEffect(() => {
    fetchAllLookups();
  }, [fetchAllLookups]);

  return {
    ...state,
    refetch: fetchAllLookups
  };
};

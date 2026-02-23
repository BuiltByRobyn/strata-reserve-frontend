import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { PropertyType } from '../types/entities.types';
import type { PropertyTypeContextType } from '../types/hooks.types';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { useClientServiceRequest } from '../hooks/useClientServiceRequest';
import { API_BASE } from '../lib/api';

const PropertyTypeContext = createContext<PropertyTypeContextType | undefined>(undefined);

export const PropertyTypeProvider = ({ children }: { children: ReactNode }) => {
  const authFetch = useAuthFetch();
  const { activeRequest } = useClientServiceRequest();
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPropertyTypes = useCallback(async () => {
    if (!activeRequest) {
      setPropertyTypes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await authFetch(
        `${API_BASE}/client/service-requests/${activeRequest.serviceRequestId}/property-types`
      );
      const data = await response.json();
      if (data.success) {
        setPropertyTypes(data.data || []);
      }
    } catch {
      setPropertyTypes([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch, activeRequest]);

  useEffect(() => {
    fetchPropertyTypes();
  }, [fetchPropertyTypes]);

  return (
    <PropertyTypeContext.Provider value={{ propertyTypes, loading, refetch: fetchPropertyTypes }}>
      {children}
    </PropertyTypeContext.Provider>
  );
};

export const usePropertyTypes = () => {
  const context = useContext(PropertyTypeContext);
  if (!context) {
    throw new Error('usePropertyTypes must be used within a PropertyTypeProvider');
  }
  return context;
};

import { useState, useCallback } from 'react';
import { useApiClient } from './useApiClient';
import type {
  SurveyQuestion,
  SurveyResponse,
  ArchivedSurveyResponse,
  SaveResponsePayload,
} from '../types/survey.types';

export const useSurvey = (routePrefix: 'client' | 'admin' = 'client') => {
  const api = useApiClient();
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [archivedResponses, setArchivedResponses] = useState<ArchivedSurveyResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async (serviceRequestId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<SurveyQuestion[]>(
        `/${routePrefix}/service-requests/${serviceRequestId}/survey/questions`
      );
      setQuestions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [api, routePrefix]);

  const fetchResponses = useCallback(async (serviceRequestId: number) => {
    try {
      const data = await api.get<SurveyResponse[]>(
        `/${routePrefix}/service-requests/${serviceRequestId}/survey/responses`
      );
      setResponses(data || []);
    } catch {
      // Silently fail - responses might not exist yet
    }
  }, [api, routePrefix]);

  const fetchArchivedResponses = useCallback(async (serviceRequestId: number) => {
    try {
      const data = await api.get<ArchivedSurveyResponse[]>(
        `/${routePrefix}/service-requests/${serviceRequestId}/survey/responses/archived`
      );
      setArchivedResponses(data || []);
    } catch {
      // Silently fail
    }
  }, [api, routePrefix]);

  const saveResponses = useCallback(async (
    serviceRequestId: number,
    payloads: SaveResponsePayload[]
  ) => {
    if (payloads.length === 0) return;
    setSaving(true);
    try {
      const data = await api.post<SurveyResponse[]>(
        `/${routePrefix}/service-requests/${serviceRequestId}/survey/responses`,
        { responses: payloads }
      );
      if (data) {
        setResponses(prev => {
          const updated = [...prev];
          for (const newResp of data) {
            const idx = updated.findIndex(r => r.questionId === newResp.questionId);
            if (idx >= 0) {
              updated[idx] = newResp;
            } else {
              updated.push(newResp);
            }
          }
          return updated;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save responses');
    } finally {
      setSaving(false);
    }
  }, [api, routePrefix]);

  const getResponseForQuestion = useCallback((questionId: number): SurveyResponse | undefined => {
    return responses.find(r => r.questionId === questionId);
  }, [responses]);

  return {
    questions,
    responses,
    archivedResponses,
    loading,
    saving,
    error,
    fetchQuestions,
    fetchResponses,
    fetchArchivedResponses,
    saveResponses,
    getResponseForQuestion,
  };
};

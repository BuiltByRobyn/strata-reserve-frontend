import { useState, useCallback } from 'react';
import { useAuthFetch } from './useAuthFetch';
import type {
  SurveyQuestion,
  SurveyResponse,
  SaveResponsePayload,
} from '../types/survey.types';
import type { ApiResponse } from '../types/entities.types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const useSurvey = (routePrefix: 'client' | 'admin' = 'client') => {
  const authFetch = useAuthFetch();
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async (serviceRequestId: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(
        `${API_BASE}/${routePrefix}/service-requests/${serviceRequestId}/survey/questions`
      );
      const data: ApiResponse<SurveyQuestion[]> = await res.json();
      if (data.success && data.data) {
        setQuestions(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch questions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [authFetch, routePrefix]);

  const fetchResponses = useCallback(async (serviceRequestId: number) => {
    try {
      const res = await authFetch(
        `${API_BASE}/${routePrefix}/service-requests/${serviceRequestId}/survey/responses`
      );
      const data: ApiResponse<SurveyResponse[]> = await res.json();
      if (data.success && data.data) {
        setResponses(data.data);
      }
    } catch {
      // Silently fail - responses might not exist yet
    }
  }, [authFetch, routePrefix]);

  const saveResponses = useCallback(async (
    serviceRequestId: number,
    payloads: SaveResponsePayload[]
  ) => {
    if (payloads.length === 0) return;
    setSaving(true);
    try {
      const res = await authFetch(
        `${API_BASE}/${routePrefix}/service-requests/${serviceRequestId}/survey/responses`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ responses: payloads }),
        }
      );
      const data: ApiResponse<SurveyResponse[]> = await res.json();
      if (data.success && data.data) {
        setResponses(prev => {
          const updated = [...prev];
          for (const newResp of data.data!) {
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
  }, [authFetch, routePrefix]);

  const getResponseForQuestion = useCallback((questionId: number): SurveyResponse | undefined => {
    return responses.find(r => r.questionId === questionId);
  }, [responses]);

  return {
    questions,
    responses,
    loading,
    saving,
    error,
    fetchQuestions,
    fetchResponses,
    saveResponses,
    getResponseForQuestion,
  };
};

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

  const fetchQuestions = useCallback(async (fileId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<SurveyQuestion[]>(
        `/${routePrefix}/file-numbers/${fileId}/survey/questions`
      );
      setQuestions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [api, routePrefix]);

  const fetchResponses = useCallback(async (fileId: number) => {
    try {
      const data = await api.get<SurveyResponse[]>(
        `/${routePrefix}/file-numbers/${fileId}/survey/responses`
      );
      setResponses(data || []);
    } catch {
      // Silently fail - responses might not exist yet
    }
  }, [api, routePrefix]);

  const fetchArchivedResponses = useCallback(async (fileId: number) => {
    try {
      const data = await api.get<ArchivedSurveyResponse[]>(
        `/${routePrefix}/file-numbers/${fileId}/survey/responses/archived`
      );
      setArchivedResponses(data || []);
    } catch {
      // Silently fail
    }
  }, [api, routePrefix]);

  const saveResponses = useCallback(async (
    fileId: number,
    payloads: SaveResponsePayload[]
  ) => {
    if (payloads.length === 0) return;
    setSaving(true);
    try {
      const data = await api.post<SurveyResponse[]>(
        `/${routePrefix}/file-numbers/${fileId}/survey/responses`,
        { responses: payloads }
      );
      setResponses(prev => {
        const updated = [...prev];
        if (data) {
          for (const newResp of data) {
            const idx = updated.findIndex(r => r.questionId === newResp.questionId && r.propertyTypeId === newResp.propertyTypeId && r.parentQuestionId === newResp.parentQuestionId);
            if (idx >= 0) {
              updated[idx] = newResp;
            } else {
              updated.push(newResp);
            }
          }
        }
        // Remove responses that were cleared (all-null payloads the backend archived without returning)
        const clearedKeys = new Set(
          payloads
            .filter(p => p.responseText == null && p.responseNumber == null && p.responseBoolean == null && p.responseDate == null && p.multipleChoiceOptionId == null)
            .map(p => `${p.parentQuestionId ?? ''}-${p.questionId}-${p.propertyTypeId}`)
        );
        return clearedKeys.size > 0
          ? updated.filter(r => !clearedKeys.has(`${r.parentQuestionId ?? ''}-${r.questionId}-${r.propertyTypeId}`))
          : updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save responses');
    } finally {
      setSaving(false);
    }
  }, [api, routePrefix]);

  const getResponseForQuestion = useCallback((questionId: number, propertyTypeId: number, parentQuestionId?: number | null): SurveyResponse | undefined => {
    return responses.find(r =>
      r.questionId === questionId &&
      r.propertyTypeId === propertyTypeId &&
      (parentQuestionId !== undefined ? r.parentQuestionId === parentQuestionId : true)
    );
  }, [responses]);

  const clearState = useCallback(() => {
    setQuestions([]);
    setResponses([]);
    setArchivedResponses([]);
    setError(null);
  }, []);

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
    clearState,
  };
};

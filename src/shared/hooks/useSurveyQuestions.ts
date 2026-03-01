import { useState, useCallback } from 'react';
import { useApiClient } from './useApiClient';
import type { SurveyQuestion } from '../types/survey.types';

export const useSurveyQuestions = () => {
  const api = useApiClient();
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async (serviceRequestId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<SurveyQuestion[]>(`/admin/service-requests/${serviceRequestId}/survey-questions`);
      setQuestions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const addQuestion = useCallback(async (serviceRequestId: number, questionId: number, propertyTypeId: number) => {
    try {
      await api.post(`/admin/service-requests/${serviceRequestId}/survey-questions`, { questionId, propertyTypeId });
      await fetchQuestions(serviceRequestId);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add question');
      return false;
    }
  }, [api, fetchQuestions]);

  const removeQuestion = useCallback(async (serviceRequestId: number, srSurveyQuestionId: number) => {
    try {
      await api.del(`/admin/service-requests/${serviceRequestId}/survey-questions/${srSurveyQuestionId}`);
      await fetchQuestions(serviceRequestId);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove question');
      return false;
    }
  }, [api, fetchQuestions]);

  return { questions, loading, error, fetchQuestions, addQuestion, removeQuestion };
};

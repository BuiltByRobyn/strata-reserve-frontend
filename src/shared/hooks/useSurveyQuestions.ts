import { useState, useCallback } from 'react';
import { useApiClient } from './useApiClient';
import type { SurveyQuestion } from '../types/survey.types';

export const useSurveyQuestions = () => {
  const api = useApiClient();
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async (fileId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<SurveyQuestion[]>(`/admin/file-numbers/${fileId}/survey-questions`);
      setQuestions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const addQuestion = useCallback(async (fileId: number, questionId: number, propertyTypeId: number) => {
    try {
      await api.post(`/admin/file-numbers/${fileId}/survey-questions`, { questionId, propertyTypeId });
      await fetchQuestions(fileId);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add question');
      return false;
    }
  }, [api, fetchQuestions]);

  const removeQuestion = useCallback(async (fileId: number, fnSurveyQuestionId: number) => {
    try {
      await api.del(`/admin/file-numbers/${fileId}/survey-questions/${fnSurveyQuestionId}`);
      await fetchQuestions(fileId);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove question');
      return false;
    }
  }, [api, fetchQuestions]);

  return { questions, loading, error, fetchQuestions, addQuestion, removeQuestion };
};

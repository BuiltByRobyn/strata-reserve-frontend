import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from './useApiClient';
import type { AdminQuestion, CreateQuestionInput, UpdateQuestionInput } from '../types/survey.types';
import type { QuestionsState } from '../types/hooks.types';

export const useQuestions = () => {
  const api = useApiClient();
  const [state, setState] = useState<QuestionsState>({
    questions: [],
    loading: true,
    error: null,
  });

  const fetchQuestions = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const questions = await api.get<AdminQuestion[]>('/admin/questions');
      setState({ questions: questions || [], loading: false, error: null });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load questions',
      }));
    }
  }, [api]);

  const createQuestion = useCallback(async (input: CreateQuestionInput) => {
    const result = await api.post<AdminQuestion>('/admin/questions', input);
    await fetchQuestions();
    return result;
  }, [api, fetchQuestions]);

  const updateQuestion = useCallback(async (id: number, input: UpdateQuestionInput) => {
    const result = await api.put<AdminQuestion>(`/admin/questions/${id}`, input);
    await fetchQuestions();
    return result;
  }, [api, fetchQuestions]);

  const deleteQuestion = useCallback(async (id: number) => {
    await api.del(`/admin/questions/${id}`);
    await fetchQuestions();
    return true;
  }, [api, fetchQuestions]);

  const setSubQuestions = useCallback(async (parentId: number, subQuestionIds: number[]) => {
    const result = await api.put<AdminQuestion>(`/admin/questions/${parentId}/sub-questions`, { subQuestionIds });
    await fetchQuestions();
    return result;
  }, [api, fetchQuestions]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  return {
    ...state,
    refetch: fetchQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    setSubQuestions,
  };
};

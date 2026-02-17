import { useState, useEffect, useCallback } from 'react';
import { useAuthFetch } from './useAuthFetch';
import type { ApiListResponse, ApiSingleResponse } from '../types/entities.types';
import type { AdminQuestion, CreateQuestionInput, UpdateQuestionInput } from '../types/survey.types';
import type { QuestionsState } from '../types/hooks.types';
import { API_BASE } from '../lib/api';

export const useQuestions = () => {
  const authFetch = useAuthFetch();
  const [state, setState] = useState<QuestionsState>({
    questions: [],
    loading: true,
    error: null,
  });

  const fetchQuestions = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await authFetch(`${API_BASE}/admin/questions`);
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data: ApiListResponse<AdminQuestion> = await response.json();
      if (data.success) {
        setState({ questions: data.data || [], loading: false, error: null });
      } else {
        throw new Error(data.error || 'Failed to fetch questions');
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load questions',
      }));
    }
  }, [authFetch]);

  const createQuestion = useCallback(async (input: CreateQuestionInput) => {
    const response = await authFetch(`${API_BASE}/admin/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    let data: ApiSingleResponse<AdminQuestion>;
    try {
      data = await response.json();
    } catch {
      throw new Error(response.statusText || `Request failed: ${response.status}`);
    }
    if (!response.ok) {
      throw new Error(data?.error || `Request failed: ${response.status}`);
    }
    if (data.success) {
      await fetchQuestions();
      return data.data!;
    }
    throw new Error(data.error || 'Failed to create question');
  }, [authFetch, fetchQuestions]);

  const updateQuestion = useCallback(async (id: number, input: UpdateQuestionInput) => {
    const response = await authFetch(`${API_BASE}/admin/questions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data: ApiSingleResponse<AdminQuestion> = await response.json();
    if (data.success) {
      await fetchQuestions();
      return data.data;
    }
    throw new Error(data.error || 'Failed to update question');
  }, [authFetch, fetchQuestions]);

  const deleteQuestion = useCallback(async (id: number) => {
    const response = await authFetch(`${API_BASE}/admin/questions/${id}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    if (data.success) {
      await fetchQuestions();
      return true;
    }
    throw new Error(data.error || 'Failed to delete question');
  }, [authFetch, fetchQuestions]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  return {
    ...state,
    refetch: fetchQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
  };
};

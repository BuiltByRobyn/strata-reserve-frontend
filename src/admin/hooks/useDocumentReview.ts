import { useState, useCallback } from 'react';
import { useApiClient } from '../../shared/hooks/useApiClient';
import type { DocumentReviewResult, BatchDocumentReviewInput } from '../../shared/types/document.types';

export const useDocumentReview = () => {
  const api = useApiClient();
  const [review, setReview] = useState<DocumentReviewResult | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReview = useCallback(async (fileId: number) => {
    setLoading(true);
    try {
      const data = await api.get<DocumentReviewResult>(`/admin/file-numbers/${fileId}/document-review`);
      setReview(data || null);
    } catch (err) {
      console.error('Error fetching document review:', err);
      setReview(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const submitReview = useCallback(async (fileId: number, input: BatchDocumentReviewInput): Promise<boolean> => {
    try {
      const data = await api.post<DocumentReviewResult>(`/admin/file-numbers/${fileId}/document-review`, input);
      setReview(data);
      return true;
    } catch (err) {
      console.error('Error submitting document review:', err);
      return false;
    }
  }, [api]);

  return { review, loading, fetchReview, submitReview };
};

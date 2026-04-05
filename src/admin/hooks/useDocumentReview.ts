import { useState, useCallback } from 'react';
import { useApiClient } from '../../shared/hooks/useApiClient';
import type { SRDocRequirement, DocumentReviewResult, DocumentReviewResponse, BatchDocumentReviewInput } from '../../shared/types/document.types';

export const useDocumentReview = () => {
  const api = useApiClient();
  const [review, setReview] = useState<DocumentReviewResult | null>(null);
  const [requirements, setRequirements] = useState<SRDocRequirement[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReview = useCallback(async (fileId: number): Promise<DocumentReviewResult | null> => {
    setLoading(true);
    try {
      const data = await api.get<DocumentReviewResponse>(`/admin/file-numbers/${fileId}/document-review`);
      const result = data.review ?? null;
      setReview(result);
      setRequirements(data.requirements ?? []);
      return result;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [api]);

  const submitReview = useCallback(async (fileId: number, input: BatchDocumentReviewInput): Promise<boolean> => {
    try {
      await api.post<DocumentReviewResult>(`/admin/file-numbers/${fileId}/document-review`, input);
      return true;
    } catch {
      return false;
    }
  }, [api]);

  return { review, requirements, loading, fetchReview, submitReview };
};

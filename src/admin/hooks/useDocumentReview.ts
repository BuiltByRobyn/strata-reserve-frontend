import { useState, useCallback } from 'react';
import { useApiClient } from '../../shared/hooks/useApiClient';
import type { SRDocRequirement, DocumentReviewResult, BatchDocumentReviewInput } from '../../shared/types/document.types';

interface DocumentReviewResponse {
  requirements: SRDocRequirement[];
  review: DocumentReviewResult | null;
}

export const useDocumentReview = () => {
  const api = useApiClient();
  const [review, setReview] = useState<DocumentReviewResult | null>(null);
  const [requirements, setRequirements] = useState<SRDocRequirement[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReview = useCallback(async (fileId: number) => {
    setReview(null);
    setRequirements([]);
    setLoading(true);
    try {
      const data = await api.get<DocumentReviewResponse>(`/admin/file-numbers/${fileId}/document-review`);
      setReview(data.review ?? null);
      setRequirements(data.requirements ?? []);
    } catch (err) {
      console.error('Error fetching document review:', err);
      setReview(null);
      setRequirements([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const submitReview = useCallback(async (fileId: number, input: BatchDocumentReviewInput): Promise<boolean> => {
    try {
      await api.post<DocumentReviewResult>(`/admin/file-numbers/${fileId}/document-review`, input);
      return true;
    } catch (err) {
      console.error('Error submitting document review:', err);
      return false;
    }
  }, [api]);

  return { review, requirements, loading, fetchReview, submitReview };
};

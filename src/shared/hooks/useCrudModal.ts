import { useState, useCallback } from 'react';
import type { UseCrudModalOptions } from '../types/hooks.types';

export function useCrudModal<TItem, TFormData>({
  initialFormData,
  itemToFormData,
  onSubmit,
}: UseCrudModalOptions<TItem, TFormData>) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TItem | null>(null);
  const [formData, setFormData] = useState<TFormData>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreateModal = useCallback(() => {
    setEditingItem(null);
    setFormData(initialFormData);
    setFormError(null);
    setIsModalOpen(true);
  }, [initialFormData]);

  const openEditModal = useCallback((item: TItem) => {
    setEditingItem(item);
    setFormData(itemToFormData(item));
    setFormError(null);
    setIsModalOpen(true);
  }, [itemToFormData]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      await onSubmit(formData, editingItem);
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, editingItem, onSubmit]);

  return {
    isModalOpen,
    editingItem,
    formData,
    setFormData,
    formError,
    setFormError,
    isSubmitting,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
  };
}

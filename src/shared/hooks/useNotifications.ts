import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from './useApiClient';
import type { InAppNotification } from '../types/entities.types';

export const useNotifications = () => {
  const api = useApiClient();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<InAppNotification[]>('/admin/notifications');
      setNotifications(data || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markRead = useCallback(async (id: number) => {
    try {
      await api.put(`/admin/notifications/${id}/read`, {});
      setNotifications((prev) =>
        prev.map((n) => (n.notificationId === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // silent
    }
  }, [api]);

  return { notifications, loading, fetchNotifications, markRead };
};

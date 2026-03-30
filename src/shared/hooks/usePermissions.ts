import { useAuth } from '../contexts/AuthContext';

export function usePermissions() {
  const { isAdmin } = useAuth();

  return {
    canDelete: isAdmin,
  };
}

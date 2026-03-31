import { useAuth } from '../contexts/AuthContext';

export function usePermissions() {
  const { isAdmin, isInspector, isAssistant } = useAuth();
  const isAdminOrAssistant = isAdmin || isAssistant;

  return {
    canDelete: isAdmin,
    canCreateStrata: isAdminOrAssistant,
    canEditStrata: isAdminOrAssistant,
    canCreateUser: isAdminOrAssistant,
    canEditUser: isAdminOrAssistant,
    canCreateAppointment: isAdminOrAssistant || isInspector,
    canEditAppointment: isAdminOrAssistant,
    canAccessQuestions: isAdminOrAssistant,
    canAccessCompanyHolidays: isAdminOrAssistant,
    canAddNote: true,
    canEditNote: isAdminOrAssistant,
    canAddTimeline: true,
    canEditTimeline: true,
    canUploadDocument: true,
    isInspector,
  };
}

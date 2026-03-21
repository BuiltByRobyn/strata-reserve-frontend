import type { Profile } from '../types/entities.types';
import { getUserDisplayName } from './formatters';

export const getInspectorOptions = (
  users: Profile[]
): { value: string; label: string }[] =>
  users
    .filter(u => u.isAdmin || ['Inspector', 'Admin'].includes(u.userType?.userTypeName ?? ''))
    .map(u => ({
      value: u.id,
      label: getUserDisplayName(u),
    }));

import type { Session, AuthError } from '@supabase/supabase-js';

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin';
  fullName: string;
  firstName: string;
  lastName: string;
  permissions: string[];
  createdAt: string;
}

export interface InspectorUser {
  id: string;
  email: string;
  role: 'inspector';
  fullName: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export interface AssistantUser {
  id: string;
  email: string;
  role: 'assistant';
  fullName: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export interface ClientUser {
  id: string;
  email: string;
  role: 'client';
  companyName: string;
  strataId: number | null;
  strataPlan: string | null;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export type AppUser = AdminUser | InspectorUser | AssistantUser | ClientUser;

export interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  isAdmin: boolean;
  isInspector: boolean;
  isAssistant: boolean;
  isClient: boolean;
}

import type { Session, AuthError } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'client';

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin';
  fullName: string;
  permissions: string[];
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

export type AppUser = AdminUser | ClientUser;

export interface AuthState {
  user: AppUser | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  isAdmin: boolean;
  isClient: boolean;
}

export interface ClientAuthContextType {
  user: ClientUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

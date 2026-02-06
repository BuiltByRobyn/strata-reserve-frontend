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

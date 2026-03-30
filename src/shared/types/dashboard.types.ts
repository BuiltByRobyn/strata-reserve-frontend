import type { ActivationRequest, AppointmentRequest, AppointmentWithDetails, FileNumber, PropertyTypeRequest } from './entities.types';

// ─── Admin Dashboard Types ────────────────────────────────────────────────────

export type UrgentCard =
  | {
      id: string;
      kind: 'property-request';
      tone: 'overdue' | 'due-today' | 'upcoming';
      badge: string;
      priority: number;
      createdAt: string;
      title: string;
      description: string;
      request: PropertyTypeRequest;
    }
  | {
      id: string;
      kind: 'appointment-request';
      tone: 'overdue' | 'due-today' | 'upcoming';
      badge: string;
      priority: number;
      createdAt: string;
      title: string;
      description: string;
      request: AppointmentRequest;
    }
  | {
      id: string;
      kind: 'rebooking';
      tone: 'overdue' | 'due-today' | 'upcoming';
      badge: string;
      priority: number;
      createdAt: string;
      title: string;
      description: string;
      request: FileNumber;
    }
  | {
      id: string;
      kind: 'activation-request';
      tone: 'overdue' | 'due-today' | 'upcoming';
      badge: string;
      priority: number;
      createdAt: string;
      title: string;
      description: string;
      request: ActivationRequest;
    }
  | {
      id: string;
      kind: 'finalized';
      tone: 'overdue' | 'due-today' | 'upcoming';
      badge: string;
      priority: number;
      createdAt: string;
      title: string;
      description: string;
      strataId: number;
    }
  | {
      id: string;
      kind: 'doc-resubmit';
      tone: 'overdue' | 'due-today' | 'upcoming';
      badge: string;
      priority: number;
      createdAt: string;
      title: string;
      description: string;
      notificationId: number;
      strataId: number;
    }
  | {
      id: string;
      kind: 'appointment-cancelled';
      tone: 'overdue' | 'due-today' | 'upcoming';
      badge: string;
      priority: number;
      createdAt: string;
      title: string;
      description: string;
      appointment: AppointmentWithDetails;
    };

export interface ActivityCard {
  id: string;
  kind: 'survey' | 'profile' | 'cancellation';
  title: string;
  description: string;
  timestamp: string;
  actionLabel: string;
  actionPath: string;
}

// ─── Client Dashboard Types ───────────────────────────────────────────────────

export interface ClientActionCard {
  id: string;
  tone: 'overdue' | 'due-today' | 'upcoming';
  badge: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaPath: string;
}

export interface ClientActivityCard {
  id: string;
  kind: 'document' | 'survey' | 'appointment' | 'request';
  title: string;
  description: string;
  timestamp: string;
  actionLabel: string;
  actionPath: string;
}

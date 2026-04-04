import type { ApiClient } from '../lib/apiClient';

export interface HelpResource {
  helpResourceId: number;
  title: string;
  description: string | null;
  resourceType: 'pdf' | 'video';
  url: string;
  audience: 'client' | 'internal';
  sortOrder: number;
}

export type HelpAudience = 'client' | 'internal';

export interface HelpContentProps {
  audience?: HelpAudience;
  apiClient?: ApiClient;
  onVideoChange?: (video: HelpResource | null) => void;
}

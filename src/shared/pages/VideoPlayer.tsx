import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { LegalLayout } from '../components/LegalLayout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { publicClient } from '../lib/apiClient';
import { toVimeoEmbedUrl } from '../utils/vimeoUtils';
import type { HelpResource } from '../types/help-resource.types';

export const VideoPlayer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [resource, setResource] = useState<HelpResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchResource = async () => {
      try {
        const data = await publicClient.get<HelpResource>(`/public/help-resources/${id}`);
        setResource(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchResource();
  }, [id]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !resource) {
    return (
      <LegalLayout title="Video Not Found">
        <p>You don't have permission to view this video.</p>
      </LegalLayout>
    );
  }

  const embedUrl = toVimeoEmbedUrl(resource.url);

  return (
    <LegalLayout title={resource.title}>
      {resource.description && <p>{resource.description}</p>}
      {embedUrl && (
        <div className="help-video-card__player">
          <iframe
            src={embedUrl}
            title={resource.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </LegalLayout>
  );
};

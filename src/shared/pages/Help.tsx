import React, { useState } from 'react';
import { LegalLayout } from '../components/LegalLayout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useHelpResources } from '../hooks/useHelpResources';
import { toVimeoEmbedUrl } from '../utils/vimeoUtils';
import type { HelpContentProps, HelpResource } from '../types/help-resource.types';

export const HelpContent: React.FC<HelpContentProps> = ({ audience = 'client', apiClient, onVideoChange }) => {
  const { resources, loading, error } = useHelpResources(audience, apiClient);
  const [activeVideo, setActiveVideo] = useState<HelpResource | null>(null);

  const handleVideoSelect = (video: HelpResource | null) => {
    setActiveVideo(video);
    onVideoChange?.(video);
  };

  const pdfs = resources.filter((r) => r.resourceType === 'pdf');
  const videos = resources.filter((r) => r.resourceType === 'video');

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <p>Unable to load resources. Please try again later.</p>;
  }

  if (activeVideo) {
    const embedUrl = toVimeoEmbedUrl(activeVideo.url);
    return (
      <div className="help-video-modal-view">
        {embedUrl && (
          <div className="help-video-card__player">
            <iframe
              src={embedUrl}
              title={activeVideo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {pdfs.length > 0 && (
        <section>
          <h2>Documentation Guides</h2>
          <p>Download the guides below to help you get started.</p>
          <ul className="help-downloads">
            {pdfs.map((r) => (
              <li key={r.helpResourceId}>
                <a href={r.url} download>{r.title}</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {videos.length > 0 && (
        <section>
          <h2>Video Guides</h2>
          <p>Watch the videos below for a walkthrough of the platform.</p>
          <ul className="help-downloads">
            {videos.map((r) => (
              <li key={r.helpResourceId}>
                {audience === 'internal' ? (
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); handleVideoSelect(r); }}
                  >
                    {r.title}
                  </a>
                ) : (
                  <a href={`/video/${r.helpResourceId}`} target="_blank" rel="noopener noreferrer">{r.title}</a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {audience !== 'internal' && (
        <section>
          <h2>Need Further Assistance?</h2>
          <p>
            If you need additional help, please contact our support team at{' '}
            <a href="mailto:clientcare@stratareserveplanning.com">
              clientcare@stratareserveplanning.com
            </a>
          </p>
        </section>
      )}
    </>
  );
};

export const Help: React.FC = () => (
  <LegalLayout title="Help & Documentation">
    <HelpContent />
  </LegalLayout>
);

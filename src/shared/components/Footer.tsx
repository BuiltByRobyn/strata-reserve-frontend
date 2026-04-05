import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApiClient } from '../hooks/useApiClient';
import { Modal } from './Modal';
import { PrivacyPolicyContent } from '../pages/PrivacyPolicy';
import { TermsOfUseContent } from '../pages/TermsOfUse';
import { HelpContent } from '../pages/Help';
import type { HelpAudience, HelpResource } from '../types/help-resource.types';

type ModalType = 'privacy' | 'terms' | 'help' | null;

export const Footer = () => {
  const { user, isAdmin, isInspector, isAssistant } = useAuth();
  const apiClient = useApiClient();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [activeVideo, setActiveVideo] = useState<HelpResource | null>(null);
  const [helpKey, setHelpKey] = useState(0);

  const isStaff = isAdmin || isInspector || isAssistant;
  const helpAudience: HelpAudience = isStaff ? 'internal' : 'client';

  const getModalTitle = () => {
    if (activeModal === 'privacy') return 'Privacy Policy';
    if (activeModal === 'terms') return 'Terms of Use';
    if (activeModal === 'help' && activeVideo) return activeVideo.title;
    if (activeModal === 'help') return 'Help & Documentation';
    return '';
  };

  const handleBack = () => {
    setActiveVideo(null);
    setHelpKey((k) => k + 1);
  };

  const handleClose = () => {
    setActiveModal(null);
    setActiveVideo(null);
  };

  const handleLinkClick = (type: ModalType) => (e: React.MouseEvent) => {
    if (user) {
      e.preventDefault();
      setActiveModal(type);
    }
  };

  return (
    <footer className="site-footer">
      <div className="site-footer__content">
        <span className="site-footer__copyright">
          &copy; {new Date().getFullYear()} BuiltByRobyn. All rights reserved.
        </span>
        <nav className="site-footer__links">
          <a href="mailto:contact@builtbyrobyn.com">Contact Us</a>
          <Link to="/help" onClick={handleLinkClick('help')}>Help</Link>
          <Link to="/privacy" onClick={handleLinkClick('privacy')}>Privacy Policy</Link>
          <Link to="/terms" onClick={handleLinkClick('terms')}>Terms of Use</Link>
        </nav>
      </div>

      {user && (
        <Modal
          isOpen={activeModal !== null}
          onClose={handleClose}
          onBack={activeVideo ? handleBack : undefined}
          title={getModalTitle()}
          size="large"
        >
          <div className="legal-content">
            {activeModal === 'privacy' && <PrivacyPolicyContent />}
            {activeModal === 'terms' && <TermsOfUseContent />}
            {activeModal === 'help' && (
              <HelpContent
                key={helpKey}
                audience={helpAudience}
                apiClient={apiClient}
                onVideoChange={setActiveVideo}
              />
            )}
          </div>
        </Modal>
      )}
    </footer>
  );
};
